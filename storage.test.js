import assert from "node:assert/strict";
import test from "node:test";
import {store} from "../core.js";

test("blocked browser storage falls back to session memory and reports failure",()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{
    configurable:true,
    value:{
      getItem(){throw new Error("blocked")},
      setItem(){throw new Error("blocked")},
      removeItem(){throw new Error("blocked")}
    }
  });
  const key=`storage-test-${Date.now()}-${Math.random()}`;
  try{
    assert.equal(store.set(key,"in-memory"),false);
    assert.equal(store.get(key),"in-memory");
    assert.equal(store.del(key),false);
    assert.equal(store.get(key),null);
  }finally{
    if(original)Object.defineProperty(globalThis,"localStorage",original);
    else delete globalThis.localStorage;
  }
});
