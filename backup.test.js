import assert from "node:assert/strict";
import test from "node:test";
import {createBackup,parseBackup,serializeBackup} from "../backup.js";
import {defaultState} from "../state.js";

test("versioned backups round-trip progress",()=>{
  const state={...defaultState(),name:"Rin",score:42,solved:{"1":{points:12,date:"2026-11-21"}}};
  const restored=parseBackup(serializeBackup(state));
  assert.equal(restored.name,"Rin");
  assert.equal(restored.score,42);
  assert.deepEqual(restored.solved,state.solved);
});

test("legacy raw progress exports remain importable",()=>{
  const state={...defaultState(),name:"Legacy Coder",score:10};
  assert.equal(parseBackup(JSON.stringify(state)).name,"Legacy Coder");
});

test("invalid and unsupported backups produce explicit errors",()=>{
  const unsupported=createBackup(defaultState());
  unsupported.version=99;
  assert.throws(()=>parseBackup("{"),/not valid JSON/);
  assert.throws(()=>parseBackup(JSON.stringify(unsupported)),/version is not supported/);
  assert.throws(()=>parseBackup(JSON.stringify({name:"Not a backup"})),/does not contain valid/);
});

test("imported data is normalized before it is returned",()=>{
  const backup=createBackup({
    ...defaultState(),
    drafts:{"1:javascript":"valid","999:javascript":"invalid"},
    teams:[{id:"team-1",name:"Team",avatar:"x",members:[{name:"Member",score:-1,streak:"bad"}]}]
  });
  const restored=parseBackup(JSON.stringify(backup));
  assert.deepEqual(restored.drafts,{"1:javascript":"valid"});
  assert.deepEqual(restored.teams[0].members[0],{name:"Member",score:0,streak:0,me:false});
});
