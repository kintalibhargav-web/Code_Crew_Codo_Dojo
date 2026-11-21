const PYODIDE_URL="https://cdn.jsdelivr.net/npm/pyodide@0.26.4/pyodide.js";
const PYODIDE_INDEX_URL="https://cdn.jsdelivr.net/npm/pyodide@0.26.4/";
const PYODIDE_SHA384="sha384-i3R37b3tF+HWudsUf1VSEOY2YxwSNMqY8DQa9Z0O3xh+NkJ9o+yjcGyIi5huj+nB";

function workerSource(){
  return `self.onmessage=e=>{const{code,fn,args}=e.data;try{const f=new Function(code+"\\nreturn typeof "+fn+' === "function" ? '+fn+" : undefined;")();if(!f)return self.postMessage({error:'Function "'+fn+'" not found'});try{const r=f(...args);self.postMessage({got:r===undefined?null:r})}catch(err){self.postMessage({err:String(err)})}}catch(err){self.postMessage({error:String(err)})}}`;
}

let javaScriptUrl;
try{javaScriptUrl=URL.createObjectURL(new Blob([workerSource()],{type:"text/javascript"}))}catch{}

export async function evaluateJavaScript(code,fn,args,limit=1500){
  if(!javaScriptUrl||typeof Worker==="undefined")throw new Error("JavaScript test workers are unavailable in this browser.");
  return new Promise(resolve=>{
    const worker=new Worker(javaScriptUrl);
    const timeout=setTimeout(()=>{worker.terminate();resolve({tle:true})},limit);
    worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();resolve(e.data)};
    worker.onerror=e=>{clearTimeout(timeout);worker.terminate();resolve({error:e.message})};
    worker.postMessage({code,fn,args});
  });
}

let pythonWorker=null,pythonUrl=null,pythonReady=null;

async function getPythonWorker(){
  if(pythonWorker&&pythonReady)return pythonReady;
  pythonReady=new Promise((resolve,reject)=>{
    if(!window.Worker||!window.crypto?.subtle){reject(new Error("A secure Python test worker is unavailable."));return}
    (async()=>{
      try{
        const response=await fetch(PYODIDE_URL,{mode:"cors",credentials:"omit"});
        if(!response.ok)throw new Error("Could not load the verified Python runtime.");
        const bytes=await response.arrayBuffer();
        const digest=await crypto.subtle.digest("SHA-384",bytes);
        const actual="sha384-"+btoa(String.fromCharCode(...new Uint8Array(digest)));
        if(actual!==PYODIDE_SHA384)throw new Error("Python runtime verification failed.");
        const runtimeText=new TextDecoder().decode(bytes);
        const source=`
const runtimeCode=${JSON.stringify(runtimeText)};
(0,new Function(runtimeCode))();
(async()=>{
  try{
    if(!self.loadPyodide)throw new Error("The Python runtime failed to initialize.");
    self.pyodide=await self.loadPyodide({indexURL:${JSON.stringify(PYODIDE_INDEX_URL)}});
    self.postMessage({type:"ready"});
  }catch(error){self.postMessage({type:"runtime-error",error:String(error.message||error)})}
})();
self.onmessage=async e=>{
  const{id,code,fn,args}=e.data;
  try{
    const py=self.pyodide;
    try{py.globals.delete(fn)}catch{}
    py.runPython(code);
    const func=py.globals.get(fn);
    if(!func){self.postMessage({id,error:'Function "'+fn+'" not found'});return}
    try{
      const pyArgs=args.map(value=>py.toPy(value));
      let result=func(...pyArgs);
      if(result&&result.toJs)result=result.toJs({dict_converter:Object.fromEntries});
      pyArgs.forEach(value=>value&&value.destroy&&value.destroy());
      if(result&&result.destroy)result.destroy();
      self.postMessage({id,got:result===undefined?null:result});
    }catch(error){self.postMessage({id,err:String(error.message||error).trim().split("\\n").slice(-1)[0]})}
  }catch(error){self.postMessage({id,error:String(error.message||error)})}
};`;
        pythonUrl=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));
        pythonWorker=new Worker(pythonUrl);
        const timeout=setTimeout(()=>reject(new Error("The Python runtime could not start here.")),30000);
        pythonWorker.onmessage=e=>{
          if(e.data.type==="ready"){clearTimeout(timeout);resolve(pythonWorker)}
          if(e.data.type==="runtime-error"){clearTimeout(timeout);reject(new Error(e.data.error))}
        };
        pythonWorker.onerror=e=>{clearTimeout(timeout);reject(new Error(e.message||"The Python runtime worker failed."))};
      }catch(error){reject(error)}
    })();
  });
  return pythonReady;
}

export async function evaluatePython(code,problem,tests,limit=1500){
  const worker=await getPythonWorker();
  const raw=[];
  for(const test of tests){
    const args=JSON.parse(JSON.stringify(test.args));
    const result=await new Promise(resolve=>{
      const id=crypto?.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
      let onMessage;
      const timeout=setTimeout(()=>{
        if(onMessage)worker.removeEventListener("message",onMessage);
        worker.terminate();
        if(pythonUrl)URL.revokeObjectURL(pythonUrl);
        pythonWorker=null;pythonUrl=null;pythonReady=null;
        resolve({tle:true});
      },limit);
      onMessage=e=>{
        if(e.data.id!==id)return;
        clearTimeout(timeout);
        worker.removeEventListener("message",onMessage);
        resolve(e.data);
      };
      worker.addEventListener("message",onMessage);
      worker.postMessage({id,code,fn:problem.pyFn,args});
    });
    if(result.error)throw new Error(result.error);
    raw.push(result);
    if(result.tle)break;
  }
  return raw;
}
