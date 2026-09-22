import test from "node:test";
import assert from "node:assert/strict";
import { acknowledge, canonical, cloudState, mergeConcurrentProgress, snapshot, syncDecision } from "../src/logic/cloud";
import { repairTrainingDays } from "../src/logic/trainingDays";
import { emptyPreferences, emptyProfile } from "../src/data/options";
import { AppState } from "../src/types";
import { resolveAccountUrl } from "../src/services/account";
const empty=():AppState=>({version:1,profile:{...emptyProfile},preferences:{...emptyPreferences},routine:[],history:[],theme:"system",completed:false,onboardingStep:0});
const trained=():AppState=>({...empty(),completed:true,profile:{...emptyProfile,weight:"80"},routine:[{id:"day",name:"Día A",exercises:[{id:"p",exerciseId:"leg-press",sets:2,range:[8,12],weight:95}]}]});
const remote=(state:AppState|null,revision=1)=>({state,revision,updated:"2026-09-10T18:00:00Z"});
test("cloud payload omits account identity, local session state and notification IDs",()=>{
  const s={...trained(),signedOut:true,weightReminderNotificationId:"local-id",cloud:{owner:"owner",revision:1,base:"secret-local"}};
  assert.equal("cloud" in cloudState(s),false); assert.equal("signedOut" in cloudState(s),false);
  assert.equal("weightReminderNotificationId" in cloudState(s),false);
  assert.equal("active" in cloudState(s),false);
  assert.equal("achievements" in cloudState(s),false);
  assert.equal("loadNormalizationVersion" in cloudState(s),false);
  assert.deepEqual(cloudState(s).routine,s.routine);
});
test("device drafts, derived achievements and empty optional collections cannot create a cloud conflict",()=>{
  const cloud=trained();
  const local=acknowledge({...cloud,
    active:{day:cloud.routine[0],index:0,startedAt:"2026-09-21T10:00:00Z",records:[],draft:[]},
    achievements:[], bodyWeights:[], plannedWorkouts:[], skippedWorkoutDates:[], strengthReferences:[],
    loadNormalizationVersion:2, programRevision:6,
  },"a",1,snapshot(cloud),"now");
  assert.equal(snapshot(local),snapshot(cloud));
  assert.equal(syncDecision(local,remote(cloud),"a"),"same");
});
test("independent completed workouts are merged without discarding either device",()=>{
  const base=trained();
  const local={...base,history:[{id:"local",dayName:"A",date:"2026-09-20",minutes:40,records:[]}]};
  const remoteState={...base,history:[{id:"remote",dayName:"B",date:"2026-09-21",minutes:40,records:[]}]};
  const merged=mergeConcurrentProgress(local,remoteState);
  assert.deepEqual(merged?.history.map(item=>item.id),["local","remote"]);
});
test("an edit to the same completed workout is never merged automatically",()=>{
  const workout={id:"same",dayName:"A",date:"2026-09-21",minutes:40,records:[]};
  const local={...trained(),history:[workout]};
  const remoteState={...trained(),history:[{...workout,minutes:41}]};
  assert.equal(mergeConcurrentProgress(local,remoteState),null);
});
test("a stale weekday selection is repaired when a cloud copy is read",()=>{
  const invalid={...trained(),profile:{...trained().profile,days:3,trainingDays:[1,1,9]}};
  assert.deepEqual(repairTrainingDays(invalid.profile as typeof invalid.profile & { trainingDays: never }).trainingDays,[1,3,5]);
  const withInvalidHistory={...invalid,routineVersions:[{effectiveFrom:"2026-09-01",profile:invalid.profile,routine:invalid.routine}]};
  assert.deepEqual(withInvalidHistory.routineVersions?.map(version=>repairTrainingDays(version.profile as typeof version.profile & { trainingDays: never }))[0].trainingDays,[1,3,5]);
});
test("canonical comparison ignores object key order and omitted undefined values",()=>{
  assert.equal(canonical({b:2,a:{c:1,d:undefined}}),canonical({a:{c:1},b:2}));
});
test("new phone downloads and old offline profile uploads only into an empty cloud",()=>{
  assert.equal(syncDecision(empty(),remote(trained()),"a"),"download");
  assert.equal(syncDecision(trained(),remote(null,0),"a"),"upload");
  assert.equal(syncDecision(trained(),remote({...trained(),profile:{...emptyProfile,weight:"85"}}),"a"),"conflict");
});
test("conflicting mobile edits never silently overwrite the other device",()=>{
  const original=trained(),local=acknowledge({...original,profile:{...original.profile,weight:"81"}},"a",1,snapshot(original),"now");
  assert.equal(syncDecision(local,remote(original),"a"),"upload");
  assert.equal(syncDecision(local,remote({...original,profile:{...original.profile,weight:"82"}},2),"a"),"conflict");
  assert.equal(syncDecision(acknowledge(original,"a",1,snapshot(original),"now"),remote({...original,profile:{...original.profile,weight:"82"}},2),"a"),"download");
});
test("lost upload acknowledgement is recognized and pending new edits survive acknowledgement",()=>{
  const sent=trained();
  assert.equal(syncDecision(sent,remote(sent,2),"a"),"same");
  const changed={...sent,profile:{...sent.profile,weight:"82"}};
  const ack=acknowledge(changed,"a",2,snapshot(sent),"now");
  assert.equal(ack.profile.weight,"82");assert.equal(syncDecision(ack,remote(sent,2),"a"),"upload");
});
test("account switching cannot upload another user's state, and lost server data is explicit",()=>{
  const s=acknowledge(trained(),"a",3,snapshot(trained()),"now");
  assert.equal(syncDecision(s,remote(null,0),"b"),"wrong-account");
  assert.equal(syncDecision(s,remote(null,0),"a"),"conflict");
});
test("account endpoint requires HTTPS outside explicit loopback development",()=>{
  assert.equal(resolveAccountUrl(undefined),"");assert.equal(resolveAccountUrl("https://api.akhyles.com/"),"https://api.akhyles.com");
  assert.equal(resolveAccountUrl("http://127.0.0.1:8094",true),"http://127.0.0.1:8094");
  for(const url of ["http://api.akhyles.com","https://u:p@api.akhyles.com","https://api.akhyles.com/?key=x","https://api.akhyles.com/#x"])
    assert.throws(()=>resolveAccountUrl(url));
});
