import {safeState} from "./state.js";

const FORMAT="codedojo-daily-progress";
const VERSION=1;
const isRecord=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);

export function createBackup(state,exportedAt=new Date().toISOString()){
  return {format:FORMAT,version:VERSION,exportedAt,data:state};
}

export function serializeBackup(state){
  return JSON.stringify(createBackup(state),null,2);
}

export function parseBackup(text){
  let parsed;
  try{parsed=JSON.parse(text)}
  catch{throw new Error("The selected file is not valid JSON.")}
  if(!isRecord(parsed))throw new Error("This file is not a CodeDojo progress backup.");

  let data=parsed;
  if(Object.hasOwn(parsed,"format")){
    if(parsed.format!==FORMAT)throw new Error("This file is not a CodeDojo progress backup.");
    if(parsed.version!==VERSION)throw new Error("This backup version is not supported.");
    data=parsed.data;
  }
  if(!isRecord(data)||!Object.hasOwn(data,"score")||!Object.hasOwn(data,"solved")){
    throw new Error("This file does not contain valid CodeDojo progress data.");
  }
  return safeState(data);
}
