export const $=(selector,root=document)=>root.querySelector(selector);
export const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
export const esc=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export const dstr=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const ord=value=>value+(["th","st","nd","rd"][(value%100>10&&value%100<14)?0:Math.min(value%10,4)%4]||"th");

const memory=new Map();
const memoryOnly=new Set();
const deletedKeys=new Set();
export const store={
  get(key){
    if(deletedKeys.has(key))return null;
    if(memoryOnly.has(key))return memory.get(key)??null;
    try{
      const value=localStorage.getItem(key);
      if(value!==null)memory.set(key,value);
      return value;
    }catch{return memory.get(key)??null}
  },
  set(key,value){
    memory.set(key,value);
    deletedKeys.delete(key);
    try{localStorage.setItem(key,value);memoryOnly.delete(key);return true}
    catch{memoryOnly.add(key);return false}
  },
  del(key){
    memory.delete(key);
    memoryOnly.delete(key);
    deletedKeys.add(key);
    try{localStorage.removeItem(key);deletedKeys.delete(key);return true}
    catch{return false}
  }
};

export const PTS={Easy:10,Medium:20,Hard:30};
export const AVATARS=["🦁","🥷","💥","🐉","🦊","🚀","🧠","⚡"];
export const BELTS=[["White",0,"#d8dbf5"],["Yellow",30,"#ffd23f"],["Orange",80,"#ff9a3c"],["Green",150,"#3ddc97"],["Blue",260,"#5b8cff"],["Brown",400,"#a9744f"],["Black",600,"#262a44"]];
export function belt(score){let index=0;BELTS.forEach((belt,position)=>{if(score>=belt[1])index=position});const current=BELTS[index],next=BELTS[index+1];return{name:current[0],col:current[2],next:next&&next[0],need:next?next[1]-score:0,pct:next?Math.round((score-current[1])/(next[1]-current[1])*100):100}}
