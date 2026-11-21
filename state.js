import {store} from "./core.js";
import {PROBLEMS} from "./problems.js";

export const STATE_KEY="codedojo.v1";
export const USER_KEY="codedojo_user";

export function seedTeams(){
  return [
    {id:"t1",name:"Stack Smashers",avatar:"💥",members:[{name:"Aarav",score:50,streak:2},{name:"Diya",score:40,streak:1},{name:"Rohan",score:30,streak:1}]},
    {id:"t2",name:"Code Ninjas",avatar:"🥷",members:[{name:"Sneha",score:40,streak:1},{name:"Vikram",score:30,streak:1},{name:"Anya",score:20,streak:0}]},
    {id:"t3",name:"Binary Beasts",avatar:"🦁",members:[{name:"Ishaan",score:20,streak:1},{name:"Meera",score:30,streak:1},{name:"Kabir",score:10,streak:0}]}
  ];
}

export function defaultState(){
  return {name:"You",teamId:null,teams:seedTeams(),solved:{},activity:{},submissions:[],drafts:{},score:0,simulate:true};
}

export function safeState(value){
  const isRecord=item=>item!==null&&typeof item==="object"&&!Array.isArray(item);
  if(!isRecord(value))return defaultState();
  const problemIds=new Set(PROBLEMS.map(problem=>String(problem.id)));
  const score=Number.isSafeInteger(value.score)&&value.score>=0?value.score:0;
  const teams=Array.isArray(value.teams)?value.teams.filter(team=>
    isRecord(team)&&typeof team.id==="string"&&/^[\w-]+$/.test(team.id)&&typeof team.name==="string"&&Array.isArray(team.members)
  ).map(team=>({
    id:team.id,
    name:team.name.trim().slice(0,24)||"Squad",
    avatar:["🦁","🥷","💥","🐉","🦊","🚀","🧠","⚡"].includes(team.avatar)?team.avatar:"🥋",
    members:team.members.filter(member=>isRecord(member)&&typeof member.name==="string").slice(0,4).map(member=>({
      name:member.name.trim().slice(0,20)||"Member",
      score:Number.isSafeInteger(member.score)&&member.score>=0?member.score:0,
      streak:Number.isSafeInteger(member.streak)&&member.streak>=0?member.streak:0,
      me:member.me===true
    }))
  })):seedTeams();
  const solved=isRecord(value.solved)?Object.fromEntries(Object.entries(value.solved).filter(([id,result])=>
    problemIds.has(id)&&isRecord(result)&&Number.isSafeInteger(result.points)&&result.points>=0&&typeof result.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(result.date)
  )):{};
  const activity=isRecord(value.activity)?Object.fromEntries(Object.entries(value.activity).filter(([date,count])=>
    /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isSafeInteger(count)&&count>=0
  )):{};
  const drafts=isRecord(value.drafts)?Object.fromEntries(Object.entries(value.drafts).filter(([key,draft])=>{
    const [id,language,...extra]=key.split(":");
    return problemIds.has(id)&&["javascript","python"].includes(language)&&extra.length===0&&typeof draft==="string"&&draft.length<=100000;
  })):{};
  const validTeams=teams.length?teams:seedTeams();
  const teamId=typeof value.teamId==="string"&&validTeams.some(team=>team.id===value.teamId)?value.teamId:null;
  return {
    ...defaultState(),
    ...value,
    name:typeof value.name==="string"&&value.name.trim()?value.name.trim().slice(0,20):"You",
    teamId,
    score,
    solved,
    activity,
    submissions:Array.isArray(value.submissions)?value.submissions.filter(item=>
      isRecord(item)&&problemIds.has(String(item.pid))&&typeof item.verdict==="string"&&Number.isFinite(item.ts)&&typeof item.lang==="string"
    ).slice(-500):[],
    drafts,
    teams:validTeams,
    simulate:typeof value.simulate==="boolean"?value.simulate:true
  };
}

export function loadState(){
  try{return safeState(JSON.parse(store.get(STATE_KEY)))}
  catch{return defaultState()}
}

export function saveState(state){return store.set(STATE_KEY,JSON.stringify(state))}
export function getUser(){try{const user=JSON.parse(store.get(USER_KEY));return user&&typeof user.name==="string"&&typeof user.email==="string"?user:null}catch{return null}}
export function setUser(user){return store.set(USER_KEY,JSON.stringify(user))}
export function clearUser(){return store.del(USER_KEY)}
