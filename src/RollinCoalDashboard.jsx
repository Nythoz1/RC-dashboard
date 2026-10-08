import React, { useState, useReducer, useEffect, useRef, useMemo } from "react";
import { db } from "./lib/storage";
import { uploadPhoto, deletePhoto } from "./lib/photos";
import { askClaude } from "./lib/ai";
import { requestBriefNow } from "./lib/brief";
import { usingCloud, getSession, signIn, signOut, onAuthChange, changePassword } from "./lib/auth";
import { getPref, setPref } from "./lib/prefs";
import { uploadEcmFile, openEcmFile, readEcmText, removeEcmFiles, ecmFileType, ecmIsText, ECM_ACCEPT, ECM_MAX_BYTES, ECM_FREE_BYTES } from "./lib/files";
import { ISSUE_SEED } from "./issuesSeed";
import { BOM_SEED, VENDOR_SEED } from "./bomSeed";
import { SERVICE_SEED, SERVICE_CATS } from "./servicesSeed";
import { AREA_BY_ID, PLACE_GROUPS, PLACE_ORDER, STORE_IDS, SLOT_CAP, SLOTS, SLOT_SIZE, SHOP_AREAS, LOT, BLDG, shopLocs, areaTitle, placeEngines } from "./shop3d/areas";
import { engineUrl, takeEngineParam, qrSvg } from "./lib/qr";
import { skuPrefix, numberSkus, renumberPlan } from "./lib/sku";
import { CREW_SPOTS, crewList, SHIFT, SHIFT_MIN, shopClock, onShift, workedMin, hoursDone, wagesSoFar, backAt } from "./shop3d/crew";
import * as Tsh from "./lib/timesheet";
import * as Mny from "./lib/money";
import { canManageLogins, listLogins, createLogin, setLoginPassword, setLoginAccess, removeLogin, makePassword } from "./lib/logins";
const FONTS="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Public+Sans:wght@400;500;600;700&display=swap";

// ═══════════════════════════════════════════════════════════════
// ROLLIN COAL v3 — FULL SHOP MANAGEMENT
// Core Tracking · Shipping · Vehicle History · AR Aging
// Tech Productivity · POs · Warranty · Comms Log · AI
// ═══════════════════════════════════════════════════════════════

const EMPTY={
  tab:"overview",modal:null,md:null,mstack:[],focus:null,
  boms:BOM_SEED,bomSheets:[],vendors:VENDOR_SEED,services:SERVICE_SEED,
  ecmJobs:[],      // ECM programming jobs — see ecmGuard and CLAUDE.md for the shape and the emissions rule
  ecmFiles:[],     // {id,jobId,path,name,size,type,at} — metadata only; the bytes live in the ecm-files bucket
  prospects:[],    // trucking fleets to cold-approach — seeded once from src/data/fleet-prospects.json (seedResearch)
  competitors:[],  // Alberta diesel / engine shops — seeded once from src/data/competitors.json
  compare:[],      // the Rollin Coal vs key competitors cheat sheet — seeded once from src/data/competitor-comparison.json
  timesheets:[],       // each employee's days, typed in the app: {id:"<emp>|<date>", emp, date, start, finish, notes, createdAt, updatedAt, by, history}; see src/lib/timesheet.js
  payPeriods:[],       // approved pay periods per employee: {id, emp, empName, start, end, kind, title, approvedAt, approvedBy, hours, reg, ot}

  wins:[],       // {id,ts,user,kind:"sale",name,sku,price,cost} — permanent wins feed
  activity:[],   // {id,ts,user,type,msg} — auto-captured shop log (capped)
  settings:[],   // single row: {id,monthlyGoal,soundOn,warrantyMonths,shopRate,ecmPrices}
  brief:null,    // latest Morning Brief — written by the brief Edge Function, read-only in the app
  customers:[],jobs:[],quotes:[],
  inventory:[
{id:1,name:"Caterpillar 3116 (1997)",sku:"BH-001",cat:"Complete Engine",cost:4500,price:5850,qty:1,reorder:0,condition:"Good - Runner",serial:"",status:"available"},
{id:2,name:"Caterpillar 3126 Freightliner FL70 (2000)",sku:"BH-002",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"S100112",status:"available"},
{id:3,name:"Caterpillar 3126 Turbo",sku:"BH-003",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-168",status:"available"},
{id:4,name:"Caterpillar C-7 (2007)",sku:"BH-004",cat:"Complete Engine",cost:7500,price:9750,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH2-398",status:"available"},
{id:5,name:"Caterpillar C-7 Ford F650 (2005)",sku:"BH-005",cat:"Complete Engine",cost:6500,price:8450,qty:1,reorder:0,condition:"Good - Runner",serial:"00000015",status:"available"},
{id:6,name:"Caterpillar C3.3B",sku:"BH-006",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-164",status:"available"},
{id:7,name:"Cummins 6.7L ISB",sku:"BH-007",cat:"Complete Engine",cost:4000,price:5200,qty:1,reorder:0,condition:"Good - Runner",serial:"471903S0103963",status:"available"},
{id:8,name:"Cummins ISB 200 6.7 (2007)",sku:"BH-008",cat:"Complete Engine",cost:4000,price:5200,qty:1,reorder:0,condition:"Good - Runner",serial:"466HM23048461",status:"available"},
{id:9,name:"Cummins ISB (2009)",sku:"BH-009",cat:"Complete Engine",cost:4500,price:5850,qty:1,reorder:0,condition:"Good - Runner",serial:"7311600",status:"available"},
{id:10,name:"Cummins ISL",sku:"BH-010",cat:"Complete Engine",cost:6000,price:7800,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-236",status:"available"},
{id:11,name:"Cummins ISL",sku:"BH-011",cat:"Complete Engine",cost:6000,price:7800,qty:1,reorder:0,condition:"Good - Runner",serial:"57898144",status:"available"},
{id:12,name:"Cummins ISL Turbo",sku:"BH-012",cat:"Complete Engine",cost:6500,price:8450,qty:1,reorder:0,condition:"Good - Runner",serial:"74244624",status:"available"},
{id:13,name:"Cummins ISX 450 (2006)",sku:"BH-013",cat:"Complete Engine",cost:8000,price:10400,qty:1,reorder:0,condition:"Good - Runner",serial:"0000005",status:"available"},
{id:14,name:"Cummins ISX-15 (2010)",sku:"BH-014",cat:"Complete Engine",cost:9000,price:11700,qty:1,reorder:0,condition:"Good - Runner",serial:"471928S0431355",status:"available"},
{id:15,name:"Cummins ISX-15 (2010)",sku:"BH-015",cat:"Complete Engine",cost:9000,price:11700,qty:1,reorder:0,condition:"Good - Runner",serial:"8YL45288",status:"available"},
{id:16,name:"Cummins ISX-15 (2012)",sku:"BH-016",cat:"Complete Engine",cost:10000,price:13000,qty:1,reorder:0,condition:"Good - Runner",serial:"S60SCB7708922",status:"available"},
{id:17,name:"Cummins N14 Celect",sku:"BH-017",cat:"Complete Engine",cost:7000,price:9100,qty:1,reorder:0,condition:"Good - Runner",serial:"472906s0382706",status:"available"},
{id:18,name:"Cummins N14 ESP+",sku:"BH-018",cat:"Complete Engine",cost:7500,price:9750,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-167",status:"available"},
{id:19,name:"Cummins Turbo",sku:"BH-019",cat:"Complete Engine",cost:1500,price:1950,qty:1,reorder:0,condition:"Good - Runner",serial:"0906352862",status:"available"},
{id:20,name:"Detroit DD-13 (2012)",sku:"BH-020",cat:"Complete Engine",cost:10000,price:13000,qty:1,reorder:0,condition:"Good - Runner",serial:"00000012",status:"available"},
{id:21,name:"Detroit DD-13 Turbo, No ECM",sku:"BH-021",cat:"Complete Engine",cost:7500,price:9750,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH2-363",status:"available"},
{id:22,name:"Detroit DD-15 Turbo (2016)",sku:"BH-022",cat:"Complete Engine",cost:13000,price:16900,qty:1,reorder:0,condition:"Good - Runner",serial:"00000010",status:"available"},
{id:23,name:"Detroit 60 Series",sku:"BH-023",cat:"Complete Engine",cost:6500,price:8450,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH1-146",status:"available"},
{id:24,name:"Detroit DD-13",sku:"BH-024",cat:"Complete Engine",cost:9000,price:11700,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH2-354",status:"available"},
{id:25,name:"Detroit DD-13",sku:"BH-025",cat:"Complete Engine",cost:9000,price:11700,qty:1,reorder:0,condition:"Good - Runner",serial:"47291050758481",status:"available"},
{id:26,name:"Detroit DD-13 (2014)",sku:"BH-026",cat:"Complete Engine",cost:11500,price:14950,qty:1,reorder:0,condition:"Good - Runner",serial:"124KM2Y4502075",status:"available"},
{id:27,name:"Detroit DD-13 Turbo (2014)",sku:"BH-027",cat:"Complete Engine",cost:12000,price:15600,qty:1,reorder:0,condition:"Good - Runner",serial:"471903s0086558",status:"available"},
{id:28,name:"Detroit DD-15",sku:"BH-028",cat:"Complete Engine",cost:9500,price:12350,qty:1,reorder:0,condition:"Good - Runner",serial:"47206s0295298",status:"available"},
{id:29,name:"Detroit DD-15 (2010)",sku:"BH-029",cat:"Complete Engine",cost:9500,price:12350,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH5-90",status:"available"},
{id:30,name:"Detroit DD-15 (2010)",sku:"BH-030",cat:"Complete Engine",cost:9500,price:12350,qty:1,reorder:0,condition:"Good - Runner",serial:"R37024",status:"available"},
{id:31,name:"Detroit DD-15 (2012)",sku:"BH-031",cat:"Complete Engine",cost:10500,price:13650,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-211",status:"available"},
{id:32,name:"Detroit DD-15 (2012)",sku:"BH-032",cat:"Complete Engine",cost:10500,price:13650,qty:1,reorder:0,condition:"Good - Runner",serial:"73310359",status:"available"},
{id:33,name:"Detroit DD-15 (2013)",sku:"BH-033",cat:"Complete Engine",cost:11500,price:14950,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-171",status:"available"},
{id:34,name:"Detroit DD-15 (2014)",sku:"BH-034",cat:"Complete Engine",cost:12000,price:15600,qty:1,reorder:0,condition:"Good - Runner",serial:"472906S0272033",status:"available"},
{id:35,name:"Detroit DD-15 (2014)",sku:"BH-035",cat:"Complete Engine",cost:12000,price:15600,qty:1,reorder:0,condition:"Good - Runner",serial:"472906s0363121",status:"available"},
{id:36,name:"Detroit DD-15 (2016)",sku:"BH-036",cat:"Complete Engine",cost:13000,price:16900,qty:1,reorder:0,condition:"Good - Runner",serial:"471903s0110411",status:"available"},
{id:37,name:"Detroit DD-15 (2016)",sku:"BH-037",cat:"Complete Engine",cost:13000,price:16900,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH2-365",status:"available"},
{id:38,name:"Detroit DD-15 (2020)",sku:"BH-038",cat:"Complete Engine",cost:16000,price:20800,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-178",status:"available"},
{id:39,name:"Deutz Air Cooled",sku:"BH-039",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"46988098",status:"available"},
{id:40,name:"Ford 6.7L",sku:"BH-040",cat:"Complete Engine",cost:4000,price:5200,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH5-81",status:"available"},
{id:41,name:"GM 6.5",sku:"BH-041",cat:"Complete Engine",cost:2000,price:2600,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH1-121",status:"available"},
{id:42,name:"GM 6.5",sku:"BH-042",cat:"Complete Engine",cost:2000,price:2600,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-179",status:"available"},
{id:43,name:"Hino W04C-T (1995)",sku:"BH-043",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH2-333",status:"available"},
{id:44,name:"International Kubota Z482-ES05",sku:"BH-044",cat:"Complete Engine",cost:2000,price:2600,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH5-96",status:"available"},
{id:45,name:"International A26 (2017)",sku:"BH-045",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH1-44",status:"available"},
{id:46,name:"International DT 466 (2004)",sku:"BH-046",cat:"Complete Engine",cost:6500,price:8450,qty:1,reorder:0,condition:"Good - Runner",serial:"471927s0198515",status:"available"},
{id:47,name:"International DT466",sku:"BH-047",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH1-33",status:"available"},
{id:48,name:"International DT466",sku:"BH-048",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"472903s0043786",status:"available"},
{id:49,name:"International DT466",sku:"BH-049",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"472906s0296965",status:"available"},
{id:50,name:"International DT466",sku:"BH-050",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-214",status:"available"},
{id:51,name:"International DT466 (2001)",sku:"BH-051",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"9GK66011",status:"available"},
{id:52,name:"International DT466 (2002)",sku:"BH-052",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"89037066",status:"available"},
{id:53,name:"International DT466 (2011)",sku:"BH-053",cat:"Complete Engine",cost:7000,price:9100,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-235",status:"available"},
{id:54,name:"International Maxxforce 13 Turbo",sku:"BH-054",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"79600375",status:"available"},
{id:55,name:"International Maxxforce-DT (2008)",sku:"BH-055",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"73376586",status:"available"},
{id:56,name:"International Maxxforce-DT (2008)",sku:"BH-056",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-314",status:"available"},
{id:57,name:"International Maxxforce-DT (2008)",sku:"BH-057",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"0000006",status:"available"},
{id:58,name:"International Maxxforce-DT (2011)",sku:"BH-058",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-213",status:"available"},
{id:59,name:"International T444E (1998)",sku:"BH-059",cat:"Complete Engine",cost:3500,price:4550,qty:1,reorder:0,condition:"Good - Runner",serial:"RG6081H030798",status:"available"},
{id:60,name:"Isuzu NPR 4JJ1 (2012)",sku:"BH-060",cat:"Complete Engine",cost:3500,price:4550,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-173",status:"available"},
{id:61,name:"Iveco 1212 (1989)",sku:"BH-061",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-181",status:"available"},
{id:62,name:"John Deere 6081 8.1L (1997)",sku:"BH-062",cat:"Complete Engine",cost:4500,price:5850,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-187",status:"available"},
{id:63,name:"John Deere M53TW",sku:"BH-063",cat:"Complete Engine",cost:4000,price:5200,qty:1,reorder:0,condition:"Good - Runner",serial:"926-96350011728",status:"available"},
{id:64,name:"Mack MP7 Turbo",sku:"BH-064",cat:"Complete Engine",cost:3589,price:4665.70,qty:0,reorder:0,condition:"Good - Runner",serial:"11743209",status:"sold"},
{id:65,name:"Mack MP7 Turbo",sku:"BH-065",cat:"Complete Engine",cost:3589,price:4665.70,qty:0,reorder:0,condition:"Good - Runner",serial:"NA-BH3-188",status:"sold"},
{id:66,name:"Mack MP7 Turbo",sku:"BH-066",cat:"Complete Engine",cost:3589,price:4665.70,qty:0,reorder:0,condition:"Good - Runner",serial:"NA-BH5-110",status:"sold"},
{id:67,name:"Mercedes OM 906 (2003)",sku:"BH-067",cat:"Complete Engine",cost:4000,price:5200,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH5-102",status:"available"},
{id:68,name:"Mercedes OM906L Turbo",sku:"BH-068",cat:"Complete Engine",cost:4500,price:5850,qty:1,reorder:0,condition:"Good - Runner",serial:"73099567",status:"available"},
{id:69,name:"Mercedes OM926LA",sku:"BH-069",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"0000003",status:"available"},
{id:70,name:"Mercedes OM926LA (2008)",sku:"BH-070",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH5-84",status:"available"},
{id:71,name:"Mitsubishi 4034-2AT3A",sku:"BH-071",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"479023s0157851",status:"available"},
{id:72,name:"Paccar PX-8",sku:"BH-073",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"0000002",status:"available"},
{id:73,name:"Paccar PX-8",sku:"BH-074",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-156",status:"available"},
{id:74,name:"Paccar PX-8 (2010)",sku:"BH-075",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"471901S023791",status:"available"},
{id:75,name:"Paccar PX-8 (2011)",sku:"BH-076",cat:"Complete Engine",cost:6000,price:7800,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-172",status:"available"},
{id:76,name:"Paccar PX8 PX8.300",sku:"BH-077",cat:"Complete Engine",cost:5000,price:6500,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH4-215",status:"available"},
{id:77,name:"Perkins",sku:"BH-078",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"79396578",status:"available"},
{id:78,name:"Volvo VED-12",sku:"BH-079",cat:"Complete Engine",cost:5500,price:7150,qty:1,reorder:0,condition:"Good - Runner",serial:"472901s0018501",status:"available"},
{id:79,name:"Yanmar TK (2017)",sku:"BH-080",cat:"Complete Engine",cost:3000,price:3900,qty:1,reorder:0,condition:"Good - Runner",serial:"NA-BH3-177",status:"available"},
{id:80,name:"Yanmar TK TK486VH",sku:"BH-081",cat:"Complete Engine",cost:2500,price:3250,qty:1,reorder:0,condition:"Good - Runner",serial:"73201987",status:"available"},
  ],
  invoices:[],schedule:[],employees:[],expenses:[],leads:[],social:[],campaigns:[],
  // NEW v3 entities
  cores:[],        // {id,engineName,custId,invoiceId,deposit,dueDate,status(pending/received/inspected/accepted/rejected/credited),notes}
  shipments:[],    // {id,custId,invoiceId,carrier,tracking,freightCost,shipDate,estDelivery,deliveryConfirmed,origin,destination,notes}
  commsLog:[],     // {id,custId,type(call/email/text/note),date,summary,followUp}
  purchaseOrders:[],//{id,vendor,items:[{d,q,r}],status(ordered/shipped/received),orderDate,eta,notes}
  warranties:[],   // {id,custId,invoiceId,engineName,warrantyPeriod,startDate,expiryDate,status(active/expired/claimed),claimNotes}
  timeEntries:[],  // {id,jobId,tech,date,hours,rate,notes} — labor logged against a work order
  diagnoses:[],    // {id,engineId,date,tech,symptoms:[],codes,findings,fix,outcome(open/monitoring/resolved),hours,rate,parts:[{d,v}],jobId,issueId,notes} — per-engine diagnosis history
  issues:ISSUE_SEED,// {id,models:[],title,symptoms:[],severity,causes,confirm,fix,parts,notes,source(seed/shop)} — common-issues knowledge base
  contentCalendar:[
    {day:"Mon",type:"Engine Spotlight",platform:"FB + IG",notes:"Feature one engine with specs & price"},
    {day:"Tue",type:"Turbo Tuesday",platform:"TikTok + Reels",notes:"Short turbo install or dyno clip"},
    {day:"Wed",type:"Tech Tip",platform:"FB + YouTube",notes:"Maintenance tip or how-to"},
    {day:"Thu",type:"Customer Build",platform:"IG + FB",notes:"Before/after build showcase"},
    {day:"Fri",type:"Engine Listings",platform:"Marketplace",notes:"Refresh all engine listings"},
    {day:"Sat",type:"Behind the Scenes",platform:"Stories + TikTok",notes:"Shop life, builds in progress"},
  ],
  // Injector cross-reference catalog {id,brand,engine,family,esn,year,oem,aftermarket,type,hp,cond,qty,cost,sell,notes}
  parts:[
    {id:9001,brand:"Detroit Diesel",engine:"DD15",family:"PLN",esn:"",year:"",oem:"",aftermarket:"",type:"Injector",hp:"",cond:"USED-A",qty:3,cost:0,sell:0,notes:""},
    {id:9002,brand:"Detroit Diesel",engine:"DD15",family:"",esn:"",year:"",oem:"",aftermarket:"",type:"Injector",hp:"",cond:"USED-A",qty:3,cost:0,sell:0,notes:""},
    {id:9003,brand:"Detroit Diesel",engine:"DD15",family:"",esn:"A4720701187",year:"",oem:"A4720701187",aftermarket:"",type:"Injector",hp:"",cond:"USED-A",qty:3,cost:0,sell:0,notes:""},
    {id:9004,brand:"Detroit Diesel",engine:"DD15",family:"",esn:"A4720701187",year:"",oem:"A4720701187",aftermarket:"",type:"Injector",hp:"",cond:"USED-A",qty:3,cost:0,sell:0,notes:""},
    {id:9005,brand:"Cummins",engine:"ISX15",family:"",esn:"",year:"",oem:"4088665",aftermarket:"",type:"Injector",hp:"",cond:"USED-A",qty:2,cost:0,sell:0,notes:""},
  ],
};

const STORE_KEYS=["customers","jobs","timeEntries","quotes","inventory","invoices","schedule","employees","expenses","leads","social","campaigns","contentCalendar","cores","shipments","commsLog","purchaseOrders","warranties","parts","wins","activity","settings","diagnoses","issues","brief","boms","bomSheets","vendors","services","ecmJobs","ecmFiles","prospects","competitors","compare","timesheets","payPeriods"];
// An employee login loads and saves only these: its own days and approvals (the database shows it
// nothing else, migration 0011). Everyone else works with every list.
const EMP_KEYS=["timesheets","payPeriods"];
const keysFor=role=>role==="employee"?EMP_KEYS:role==="none"?[]:STORE_KEYS;

// ── Shop activity log (who-did-what, auto-captured as a byproduct of work) ──
let CURRENT_USER="shop";
export function setActivityUser(u){CURRENT_USER=u||"shop";}
const nowIso=()=>new Date().toISOString();
const pushAct=(s,type,msg)=>[{id:Date.now()+Math.random(),ts:nowIso(),user:CURRENT_USER,type,msg},...(s.activity||[])].slice(0,400);
// Recompute every engine's auto labor cost from time entries logged against
// engine-linked jobs (hours x snapshotted rate) PLUS diagnosis hours, and the
// parts consumed during diagnoses (dxParts). Recomputed from scratch on any
// jobs/timeEntries/diagnoses change so it can never drift.
// A work order is one of two kinds:
//   reman   — labour INTO an engine we own. Hours × the tech's pay rate land on
//             that engine's cost basis. Nobody is billed.
//   service — work FOR a customer (an engine swap, a head gasket, diagnostics),
//             charged on its own. Its hours are the cost of that service and
//             never touch an engine's cost basis — the swap that goes with a sale
//             must not make the engine look less profitable.
// Jobs saved before `kind` existed keep their old behaviour: linked to an engine
// means reman, otherwise service.
const jobKind=j=>(j&&j.kind)||(j&&j.engineId?"reman":"service");
const syncLabor=st=>{
  const jobEng={};(st.jobs||[]).forEach(j=>{if(j.engineId&&jobKind(j)==="reman")jobEng[j.id]=+j.engineId;});
  const lab={},dxp={};(st.timeEntries||[]).forEach(t=>{const e=jobEng[t.jobId];if(e)lab[e]=(lab[e]||0)+(+t.hours||0)*(+t.rate||0);});
  (st.diagnoses||[]).forEach(x=>{const e=+x.engineId;if(!e)return;lab[e]=(lab[e]||0)+(+x.hours||0)*(+x.rate||0);dxp[e]=(dxp[e]||0)+(x.parts||[]).reduce((a,p)=>a+(+p.v||0),0);});
  // ECM work on one of our own engines that nobody pays for (warranty) is that engine's
  // cost, like a diagnosis. Customer-paid ECM work is the job's own cost, never the engine's.
  (st.ecmJobs||[]).forEach(x=>{const e=+x.engineId;if(!e||x.billTo!=="warranty")return;lab[e]=(lab[e]||0)+(+x.hours||0)*(+x.rate||0);dxp[e]=(dxp[e]||0)+(x.parts||[]).reduce((a,p)=>a+(+p.v||0),0);});
  let changed=false;
  const inv=(st.inventory||[]).map(i=>{if(!isEngine(i))return i;const v=Math.round((lab[i.id]||0)*100)/100;const p=Math.round((dxp[i.id]||0)*100)/100;if((+i.laborLogged||0)===v&&(+i.dxParts||0)===p)return i;changed=true;return{...i,laborLogged:v,dxParts:p};});
  return changed?{...st,inventory:inv}:st;
};
const LABOR_LISTS=["jobs","timeEntries","diagnoses","ecmJobs"];
// Labour, diagnoses and warranty ECM work raise an engine's cost through syncLabor. When that pushes a WIP
// engine past 75% or 90% of its list price, it's logged and toasted like a direct edit would be.
const syncLaborUw=(prev,st)=>{const nx=syncLabor(st);if(nx===st)return st;const rk=v=>v==="crit"?2:v==="warn"?1:0;const autos=[];let toast=nx.toast;
  (nx.inventory||[]).forEach(i=>{if(!isEngine(i))return;const b=(prev.inventory||[]).find(x=>x.id===i.id);if(!b)return;const a0=rk(uwLevel(i));if(a0>rk(uwLevel(b))){const pct=Math.round((uwRatio(i)||0)*100);const nm=i.name||i.sku||"Engine";autos.push("⚠ "+nm+" is at "+pct+"% of expected sale — "+(a0===2?"UNDERWATER":"margin risk"));toast={msg:"⚠ "+nm+" crossed "+pct+"% of list — decide before the next dollar goes in",t:Date.now()};}});
  return autos.length?{...nx,toast,activity:[...autos.map((m,k)=>({id:Date.now()+Math.random()+k,ts:nowIso(),user:"auto",type:"auto",msg:m})),...(nx.activity||[])].slice(0,400)}:nx;};
const describeAdd=(list,d)=>{switch(list){
  case "inventory":return (d.cat==="Complete Engine"||d.cat==="Core")?"🔧 Engine added: "+(d.name||d.sku||""):"📦 Part added: "+(d.name||d.sku||"");
  case "customers":return "👤 Customer added: "+(d.name||"");
  case "bomSheets":return "📋 Teardown worksheet started"+(d.engName?": "+d.engName:"");
  case "jobs":return "🛠 Job created: "+(d.service||"");
  case "services":return "🏷 Service added to the price list: "+(d.name||"");
  case "ecmJobs":return "🖥 ECM job opened"+(d.unit?": unit "+d.unit:"")+(d.family?" · "+ecmFamLabel(d.family):"");
  case "ecmFiles":return "📎 ECM file uploaded: "+(d.name||"");
  case "prospects":return "🎯 Prospect added: "+(d.name||"");
  case "competitors":return "🏁 Shop added to competitors: "+(d.name||"");
  case "compare":return "📊 Added to the comparison: "+(d.business||"");
  case "timeEntries":return "⏱ "+(d.hours||0)+"h logged by "+(d.tech||"?");
  case "invoices":return "🧾 Invoice created: "+(d.invNum||"");
  case "quotes":return "📋 Quote created: "+(d.quoteNum||"");
  case "cores":return "🔄 Core tracked: "+(d.engineName||"");
  case "shipments":return "🚚 Shipment added"+(d.carrier?" — "+d.carrier:"");
  case "warranties":return "📜 Warranty added: "+(d.engineName||"");
  case "expenses":return "💸 Expense logged: "+(d.desc||d.category||"");
  case "purchaseOrders":return "🧾 PO created: "+(d.vendor||"");
  case "employees":return "👷 Employee added: "+(d.name||"");
  case "diagnoses":return "🩺 Diagnosis logged: "+((d.symptoms||[]).join(", ")||"—")+(d.engineName?" — "+d.engineName:"");
  case "issues":return "📚 Common issue added: "+(d.title||"");
  case "payPeriods":return "✅ "+(d.title||"Timesheet approved");
  case "timesheets":return null;   // the day itself keeps who and when (history)
  default:return null;}};
function reducer(s,a){switch(a.type){
  case "TAB":return{...s,tab:a.v,mstack:[],focus:a.focus||null};case "MODAL":{const st=s.mstack||[];if(s.modal===a.v)return{...s,md:a.d||null};const ix=st.findIndex(x=>x.modal===a.v);if(ix>=0)return{...s,modal:a.v,md:a.d||null,mstack:st.slice(0,ix)};if(!s.modal)return{...s,modal:a.v,md:a.d||null,mstack:[]};return{...s,modal:a.v,md:a.d||null,mstack:[...st,{modal:s.modal,md:s.md}].slice(-8)};}
  case "BACK":{const st=s.mstack||[];if(!st.length)return{...s,modal:null,md:null};const p=st[st.length-1];return{...s,modal:p.modal,md:p.md,mstack:st.slice(0,-1)};}
  case "CLOSE":return{...s,modal:null,md:null,mstack:[]};
  case "LOAD":return{...s,...a.d};case "RESET":return{...EMPTY,tab:s.tab};
  case "ADD":{let d0=a.d;
    if(a.list==="inventory"&&d0&&(d0.cat==="Complete Engine"||d0.cat==="Core")&&d0.status)d0={...d0,stageDate:nowIso(),stageLog:[{st:d0.status,ts:nowIso()}],...(d0.status==="sold"?{soldDate:isoToday()}:{})};
    if(a.list==="ecmJobs"&&d0)d0=ecmGuard(null,d0).j;
    if(a.list==="inventory"&&d0&&isEngine(d0)&&!String(d0.sku||"").trim())d0={...d0,sku:nextEngineSku(s.inventory,d0)};
    const msg=describeAdd(a.list,d0||{});
    const stA={...s,[a.list]:[...(s[a.list]||[]),{id:Date.now(),...d0}],activity:msg?pushAct(s,"add",msg):s.activity,...(a.keep?{}:{modal:null,md:null}),toast:{msg:(a.label||"Added"),t:Date.now()}};
    return LABOR_LISTS.includes(a.list)?syncLaborUw(s,stA):stA;}
  case "UPDATE":{if(a.list==="inventory"&&a.d&&a.d.sku!==undefined){const i0=(s.inventory||[]).find(x=>x.id===a.id);const o=String((i0&&i0.sku)||"").trim(),nw=String(a.d.sku||"").trim();if(i0&&o&&o!==nw)a={...a,d:{...a.d,oldSkus:[...new Set([...(i0.oldSkus||[]),o])].filter(x=>x!==nw)}};}
    let d2=a.d,act=null,wins=s.wins,splash=s.soldSplash,extra={},autos=[],toast=s.toast;
    const it=(s[a.list]||[]).find(x=>x.id===a.id);
    if(a.list==="inventory"&&it&&a.d.status&&isEngine(it)&&engStatus(it)!==a.d.status){
      d2={...a.d,stageDate:nowIso(),stageLog:[...(it.stageLog||[]),{st:a.d.status,ts:nowIso()}],...(a.d.status==="sold"?{soldDate:isoToday()}:engStatus(it)==="sold"?{soldDate:""}:{})};
      act="🔧 "+(it.name||it.sku||"Engine")+" → "+engStatusLabel(a.d.status);
      // A sale records the engine, the price it sold at, its cost basis and the shop labour in that cost
      // (Reports leaves that labour out of the engine's cost: it's already in payroll).
      if(a.d.status==="sold"){const nw={...it,...a.d};const w={id:Date.now(),ts:nowIso(),user:CURRENT_USER,kind:"sale",engineId:it.id,name:nw.name||nw.sku||"Engine",sku:nw.sku||"",price:+nw.price||0,cost:costBasis(nw),labor:+nw.laborLogged||0};wins=[w,...(s.wins||[])];splash=w;act="💰 SOLD: "+w.name+" — $"+w.price.toLocaleString();}
      // Moving an engine back out of Sold undoes that sale: its entry in the sales feed and the warranty that
      // started by itself (if nothing was claimed on it) go, so a mis-tap never counts twice.
      if(engStatus(it)==="sold"&&a.d.status!=="sold"){const wi=(s.wins||[]).findIndex(w=>w.kind==="sale"&&(w.engineId!=null?sameId(w.engineId,it.id):!!w.sku&&[it.sku,...(it.oldSkus||[])].includes(w.sku)));if(wi>=0)wins=(s.wins||[]).filter((_,k)=>k!==wi);
        const ws0=s.warranties||[];const keepW=ws0.filter(w=>!(w.auto&&sameId(w.engineId,it.id)&&w.status==="active"&&!String(w.claimNotes||"").trim()));if(keepW.length!==ws0.length){extra.warranties=keepW;autos.push("🛡 Warranty removed with the sale: "+(it.name||it.sku||"Engine"));}
        act="↩ Sale undone: "+(it.name||it.sku||"Engine")+" → "+engStatusLabel(a.d.status);}
      if(a.d.status==="sold"&&!(s.warranties||[]).some(w=>sameId(w.engineId,it.id))){const inv0=(s.invoices||[]).find(v=>+v.engineId===it.id);const months=+getSet(s).warrantyMonths||12;const sd=isoToday();const ed=new Date(sd+"T12:00:00");ed.setMonth(ed.getMonth()+months);const wr={id:Date.now()+1,engineId:it.id,custId:inv0?(+inv0.custId||0):0,invoiceId:inv0?inv0.id:null,engineName:it.name||it.sku||"Engine",warrantyPeriod:months+" months",startDate:sd,expiryDate:ed.toISOString().slice(0,10),status:"active",claimNotes:"",auto:true};extra.warranties=[...(s.warranties||[]),wr];autos.push("🛡 Warranty auto-started: "+wr.engineName+" · "+wr.warrantyPeriod+" (to "+wr.expiryDate+")");}
      if(a.d.status==="in-reman"&&!(s.jobs||[]).some(j=>+j.engineId===it.id&&jobKind(j)==="reman"&&j.status!=="complete")){const nj={id:Date.now()+2,kind:"reman",engineId:it.id,custId:0,vehicle:it.sku||"",service:"Reman — "+(it.name||it.sku||"engine"),type:"Reman",tech:"Unassigned",due:"",priority:"medium",status:"in-progress",notes:"Auto-opened when the engine entered reman.",auto:true};extra.jobs=[...(s.jobs||[]),nj];autos.push("🛠 Reman work order auto-opened: "+nj.service);}
    }else if(a.list==="inventory"&&it&&a.d.photo&&it.photo!==a.d.photo){act="📷 Photo added: "+(it.name||it.sku||"");}
    else if(a.list==="inventory"&&it&&a.d.partsLog&&(a.d.partsLog||[]).length>(it.partsLog||[]).length){const np=a.d.partsLog[(a.d.partsLog||[]).length-1]||{};act="🧩 Part into "+(it.name||it.sku||"engine")+": "+(np.d||"part")+" — $"+(+np.v||0).toLocaleString();}
    else if(a.list==="inventory"&&it&&a.d.loc!==undefined&&((it.loc||"")!==(a.d.loc||"")||(a.d.spot!=null&&String(it.spot??"")!==String(a.d.spot)))){act="📍 "+(it.sku||it.name||"Engine")+" → "+(a.d.loc?areaTitle(a.d.loc)+(a.d.spot!=null&&a.d.spot!==""?" · spot "+(+a.d.spot+1):""):"placed by status");}
    else if(a.list==="invoices"&&it&&a.d.status==="paid"&&it.status!=="paid"){act="💰 Invoice paid: "+(it.invNum||a.id);}
    else if((a.list==="prospects"||a.list==="competitors")&&it&&Array.isArray(a.d.log)&&a.d.log.length>(it.log||[]).length&&a.d.log[a.d.log.length-1].type!=="note"){const e=a.d.log[a.d.log.length-1];act={visit:"🚚 Visit",call:"📞 Call",email:"✉ Email"}[e.type]+": "+(it.name||"")+(e.outcome?" · "+e.outcome:"");}
    else if((a.list==="prospects"||a.list==="competitors")&&it&&a.d.status!==undefined&&(it.status||"")!==(a.d.status||"")){act="🎯 "+(it.name||"")+" → "+pstOf(a.d.status)[1];}
    else if(a.list==="jobs"&&it&&a.d.status&&it.status!==a.d.status){act="🛠 Job → "+a.d.status+(it.service?" ("+it.service+")":"");}
    if(a.list==="inventory"&&it&&isEngine(it)){const rk=v=>v==="crit"?2:v==="warn"?1:0;const af={...it,...d2};const b0=rk(uwLevel(it)),a0=rk(uwLevel(af));if(a0>b0){const pct=Math.round((uwRatio(af)||0)*100);const nm=it.name||it.sku||"Engine";autos.push("⚠ "+nm+" is at "+pct+"% of expected sale — "+(a0===2?"UNDERWATER":"margin risk"));toast={msg:"⚠ "+nm+" crossed "+pct+"% of list — decide before the next dollar goes in",t:Date.now()};}}
    // ECM jobs: the emissions rule, completion checks, and 30/60/90-day follow-ups on completion.
    if(a.list==="ecmJobs"&&it){const g=ecmGuard(it,{...it,...d2});d2=g.j;if(g.msg)toast={msg:g.msg,long:true,t:Date.now()};if(g.j.status!==it.status)act="🖥 ECM job → "+ecmStLabel(g.j.status)+(g.j.holdReason==="emissions"?" (emissions issue)":"")+" · "+ecmJobLabel(s,g.j);
      if(g.j.status==="complete"&&it.status!=="complete"){const sc=ecmFollowups(s,g.j);if(sc!==s.schedule){extra.schedule=sc;autos.push("📅 ECM follow-ups booked at 30, 60 and 90 days · "+ecmJobLabel(s,g.j));}toast={msg:"✓ ECM job complete. Follow-ups are booked at 30, 60 and 90 days.",long:true,t:Date.now()};}}
    const act0=act?pushAct(s,"update",act):s.activity;const activity=autos.length?[...autos.map((m,k)=>({id:Date.now()+Math.random()+k,ts:nowIso(),user:"auto",type:"auto",msg:m})),...act0].slice(0,400):act0;
    const stU={...s,activity,wins,soldSplash:splash,toast,...extra,[a.list]:(s[a.list]||[]).map(x=>x.id===a.id?{...x,...d2}:x)};
    return LABOR_LISTS.includes(a.list)?syncLaborUw(s,stU):stU;}
  case "DELETE":{const item=(s[a.list]||[]).find(x=>x.id===a.id);const stD={...s,[a.list]:(s[a.list]||[]).filter(x=>x.id!==a.id),lastDel:item?{list:a.list,item}:null,activity:item&&a.list!=="timesheets"?pushAct(s,"delete","🗑 Deleted: "+((a.list==="ecmJobs"?"ECM job"+(item.unit?" · unit "+item.unit:""):"")||item.name||item.sku||item.invNum||item.service||item.title||item.engName||item.business||(item.symptoms&&item.symptoms.join(", "))||a.list)):s.activity,toast:{msg:item&&recName(item)?"Deleted "+recName(item).slice(0,48):"Deleted",undo:!!item,t:Date.now()}};
    return LABOR_LISTS.includes(a.list)?syncLaborUw(s,stD):stD;}
  case "UNDO":{if(!s.lastDel)return s;const stR={...s,[s.lastDel.list]:[...(s[s.lastDel.list]||[]),s.lastDel.item],lastDel:null,toast:{msg:"Restored",t:Date.now()}};
    return LABOR_LISTS.includes(s.lastDel.list)?syncLaborUw(s,stR):stR;}
  case "TOAST":return{...s,toast:a.d};
  case "SPLASH":return{...s,soldSplash:a.d};
  default:return s;}}

// Helpers
const $$=n=>"$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const $K=n=>n>=10000?"$"+(n/1000).toFixed(1)+"k":$$(n);
// Invoice and quote money lives in src/lib/money.js (imported as Mny): each keeps its own tax rate (GST 5%, or
// HST where the engine goes) and the tax is rounded once. invTot = an invoice with tax; qTot = a quote
// before tax; qTax = a quote with tax.
const invTot=inv=>Mny.docTotal(inv);
const qTot=q=>Mny.docSub(q);
const qTax=q=>Mny.docTotal(q);
const stk=i=>i.qty===0?"out":i.qty<=i.reorder?"low":"ok";
// A link can hold the id as a number or, from older edits, as text: compare as text.
const sameId=(a,b)=>a!=null&&b!=null&&a!==""&&String(a)===String(b);
const cn=(c,id)=>((c||[]).find(x=>sameId(x.id,id))||{}).name||"Unknown";
// Job "customer" label: real customer, or the shop itself for internal reman work
const jobCust=(s,j)=>j.custId?cn(s.customers,j.custId):(j.engineId?"Shop · Reman":"—");
// ── Services: what we do for customers and what we charge for it ──
// Cost and charge are kept apart on purpose. A time entry's rate is what the
// tech is PAID, so hours × rate is what a job costs us. A service job's charge
// is what the CUSTOMER pays: a flat price, or hours × the shop labour rate.
const shopRate=s=>+getSet(s).shopRate||0;
const svcById=(s,id)=>(s.services||[]).find(x=>x.id===+id);
const svcActive=s=>(s.services||[]).filter(x=>x.active!==false);
const truthy=v=>v===true||v===1||v==="1"||v==="true";
// Categories in the price list's own order, then anything the shop added.
const svcCats=list=>{const cs=[...new Set((list||[]).map(x=>x.cat||"Other"))];return cs.sort((a,b)=>{const ia=SERVICE_CATS.indexOf(a),ib=SERVICE_CATS.indexOf(b);return((ia<0?99:ia)-(ib<0?99:ib))||a.localeCompare(b);});};
const jobTime=(s,j)=>(s.timeEntries||[]).filter(t=>t.jobId===j.id);
const jobHours=(s,j)=>Math.round(jobTime(s,j).reduce((a,t)=>a+(+t.hours||0),0)*100)/100;
const jobCost=(s,j)=>jobTime(s,j).reduce((a,t)=>a+(+t.hours||0)*(+t.rate||0),0);
// Flat or hourly. A service job saved without a price bills its hours.
const jobPricing=j=>j.pricing||(+j.charge?"flat":"hourly");
const jobRate=(s,j)=>+j.rate||shopRate(s);
// The invoice that billed a job, if it still exists. Deleting that invoice un-bills the job; undo re-links it.
const jobInv=(s,j)=>(j&&j.invoiceId&&(s.invoices||[]).find(x=>x.id===+j.invoiceId))||null;
// What we charge for a service job. Hourly work tracks the hours logged until
// it's billed; from then on the charge is frozen at what the invoice said.
const jobCharge=(s,j)=>{if(jobKind(j)!=="service")return 0;if(jobPricing(j)==="hourly"&&!jobInv(s,j))return Math.round(jobHours(s,j)*jobRate(s,j)*100)/100;return +j.charge||0;};
// Default charge when a service is picked: its flat price, or typical hours × rate.
const svcDefault=(s,sv)=>!sv?0:sv.pricing==="hourly"?(+sv.hours||0)*shopRate(s):(+sv.price||0);
// The invoice line that bills one service job.
const jobBillLine=(s,j)=>{const nm=j.service||((svcById(s,j.svcId)||{}).name)||"Service";if(jobPricing(j)==="hourly"){const h=jobHours(s,j);return{d:nm+" — "+h+"h",q:h,r:jobRate(s,j),svcId:j.svcId||null,jobId:j.id};}return{d:nm,q:1,r:+j.charge||0,svcId:j.svcId||null,jobId:j.id};};
// Totals per service: every service work order, plus invoice lines added
// straight from the price list with no work order. Key "other" = service work
// orders where no price-list service was picked.
const svcStats=s=>{const o={};const add=(k,nm,c,h,co)=>{if(!o[k])o[k]={n:0,charged:0,hours:0,cost:0,name:nm};o[k].n++;o[k].charged+=c;o[k].hours+=h;o[k].cost+=co;};
  (s.jobs||[]).filter(j=>jobKind(j)==="service").forEach(j=>add(j.svcId?String(j.svcId):"other",j.service,jobCharge(s,j),jobHours(s,j),jobCost(s,j)));
  (s.invoices||[]).forEach(inv=>(inv.items||[]).forEach(l=>{if(l.svcId&&!l.jobId)add(String(l.svcId),l.d,(+l.q||0)*(+l.r||0),0,0);}));
  return o;};
// ── Engine unit record helpers ──
const isEngine=i=>i.cat==="Complete Engine"||i.cat==="Core";
const ENG_STATUSES=["core","in-reman","available","on-hold","sold"];
const engStatus=i=>i.status||(i.cat==="Core"?"core":"available");
const engStatusLabel=st=>({core:"Core",["in-reman"]:"In Reman",available:"Available",["on-hold"]:"On Hold",sold:"Sold"}[st]||st);
// Shop 3D: where each engine is kept. The plan and the placement rule live in src/shop3d/areas.js;
// an engine's own `loc` (a storage area id) wins over the rule. remanned = it went through reman here.
const remanned=i=>(i.stageLog||[]).some(x=>x&&x.st==="in-reman")||/reman|rebuilt|overhaul/i.test(String(i.condition||""));
const SIZE_HD=["MAXXFORCE13","MAXXFORCE11","60SERIES","SERIES60","50SERIES","SERIES50","ISX15","X15","ISX12","ISX","ISM","N14","DD13","DD15","DD16","A26","3406","C15","C13","MX13","MX11","MP7","MP8","VED12","D13","D11"];
const SIZE_SM=["C33","4JJ1","W04","M53","4034","YANMAR","DEUTZ","PERKINS","KUBOTA","GM65"];
const sizeClass=i=>{const k=familyKey(i);return SIZE_HD.includes(k)?"hd":SIZE_SM.includes(k)?"sm":"mid";};
const engLocs=s=>shopLocs((s.inventory||[]).filter(isEngine),{status:engStatus,remanned});
// Make, model and year read from what's typed (a make / model / year field wins), else from the engine's name.
const ENG_MAKES=[[/\bcat(erpillar)?\b|\bc(7|9|10|11|12|13|15|16|18)\b|\b3(116|126|176|406|408)\b/i,"Caterpillar"],[/cummins|\bisx|\bx1[25]\b|\bisb|\bisl|\bism|\bisc\b|\bn14\b|\bl10\b|\b6\.7l?\b/i,"Cummins"],[/detroit|\bdd1[356]\b|series ?60|\bs60\b/i,"Detroit Diesel"],[/international|navistar|maxxforce|\bdt ?4(66|08)|\bdt ?530/i,"International"],[/paccar|\bmx-?1[13]\b/i,"Paccar"],[/mercedes|\bmbe\b|\bom ?\d{3}/i,"Mercedes-Benz"],[/\bmack\b|\bmp[78]\b|\be7\b/i,"Mack"],[/volvo|\bd1[136]\b/i,"Volvo"],[/deere/i,"John Deere"],[/power ?stroke|\bford\b/i,"Ford"],[/duramax/i,"Duramax"],[/hino/i,"Hino"],[/isuzu/i,"Isuzu"],[/deutz/i,"Deutz"],[/yanmar/i,"Yanmar"],[/perkins/i,"Perkins"],[/kubota/i,"Kubota"]];
const engMake=i=>(i&&i.make)||((ENG_MAKES.find(([re])=>re.test((i&&i.name)||""))||[0,""])[1]);
const engYear=i=>(i&&i.year)||((String((i&&i.name)||"").match(/\((19|20)\d{2}\)/)||[""])[0].replace(/[()]/g,""));
const engModel=i=>{if(i&&i.model)return i.model;const mk=engMake(i);let n=String((i&&i.name)||"").replace(/\b(19|20)\d{2}\b/g,"").replace(/[\s,]+\)/g,")").replace(/\(\s*,?\s*/g,"(").replace(/\(\s*\)/g,"");const mks=new RegExp("\\b("+[mk,"caterpillar","cat","cummins","detroit diesel","detroit","international","navistar","paccar","mercedes-benz","mercedes","mack","volvo","john deere","ford","deutz","yanmar","perkins","kubota","diesel","engine","motor"].filter(Boolean).map(x=>x.replace(/[-]/g,"\\-")).join("|")+")\\b","gi");n=n.replace(mks," ").replace(/(\d+)\s*hp\b/gi,"$1").replace(/\s+/g," ").replace(/^[\s,·-]+|[\s,·-]+$/g,"").trim();return n||"—";};
// SKUs (lib/sku.js): RC-<brand><family><year>-<counter>. The family is the engine's FAMILIES key, or the first word of its model.
// A brand-named "family" (DEUTZ, YANMAR…) isn't a family: those engines use the first word of their model (Deutz FL5 → FL).
const BRAND_FAMS=["YANMAR","DEUTZ","PERKINS","KUBOTA"];
const engFamily=i=>{const n=normM(i&&i.name);const f=FAMILIES.find(x=>n.includes(x));return f&&!BRAND_FAMS.includes(f)?f:normM(String(engModel(i)).split(/\s+/)[0]||"");};
const engSkuPrefix=i=>skuPrefix({make:engMake(i),family:engFamily(i),year:engYear(i)});
const takenSkus=(inv,skip)=>(inv||[]).filter(x=>!(skip!=null&&sameId(x.id,skip))).flatMap(x=>[x.sku,...(x.oldSkus||[])]).filter(Boolean);
const nextEngineSku=(inv,eng)=>numberSkus([{id:"new",prefix:engSkuPrefix(eng)}],takenSkus(inv,eng&&eng.id)).get("new");
const hpTxt=i=>i&&i.ratedHp?(/hp/i.test(String(i.ratedHp))?String(i.ratedHp):i.ratedHp+" HP"):"";
// What's on an engine: from its BOM worksheet (new, reused in spec, at the machine shop) and the parts log.
const enginePartsList=(s,i)=>{const sh=sheetFor(s,i.id),b=sh?bomById(s,sh.bomId):null;const nm=t=>String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const fresh=b?bomBuy(b,sh).map(z=>({part:z.l.part,qty:z.l.qty,note:z.why==="miss"?"missing from the core":z.why==="repl"?"replaced":""})):[];
  const kept=b?bomPick(b,sh,"reuse").map(l=>({part:l.part,qty:l.qty,note:(sheetRow(sh,l.id)||{}).meas||""})):[];
  const mach=b?bomPick(b,sh,"mach").map(l=>({part:l.part,qty:l.qty})):[];
  const seen=new Set(fresh.map(p=>nm(p.part)));const logged=(i.partsLog||[]).filter(p=>p&&p.d&&!seen.has(nm(p.d))).map(p=>({part:p.d,note:p.date||""}));
  return{fresh,kept,mach,logged,bom:b,signed:!!(sh&&sh.decidedAt)};};
// QR tags: 3.5 × 2 in, ten to a Letter page, with cut lines. Each code opens that engine's record in the dashboard.
async function printQrTags(engs){
  const w=window.open("","_blank","width=920,height=1080");if(!w)return false;
  w.document.write('<p style="font-family:Arial,sans-serif;padding:20px">Making the tags…</p>');
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let tags;try{tags=await Promise.all(engs.map(async i=>({i,svg:await qrSvg(engineUrl(i.id))})));}catch(e){w.document.body.innerHTML='<p style="font-family:Arial,sans-serif;padding:20px">The QR codes didn\'t load. Check the connection and try again.</p>';return true;}
  const tag=({i,svg})=>{const mm=[engMake(i),engModel(i)].filter(x=>x&&x!=="—").join(" ")||i.name||"Engine";
    return '<div class="tag"><div class="qr">'+svg+'</div><div class="tx"><div class="br">ROLLIN COAL</div><div class="sku">'+esc(i.sku||"—")+'</div><div class="nm">'+esc(mm)+'</div><div class="ln">'+esc([engYear(i),hpTxt(i)].filter(Boolean).join(" · "))+'</div>'+((i.serial||i.esn)?'<div class="ln">ESN '+esc(i.serial||i.esn)+'</div>':'')+'<div class="sc">Scan for the full record</div></div></div>';};
  const html='<!doctype html><html><head><meta charset="utf-8"><title>QR tags</title><style>@page{size:letter portrait;margin:0.5in 0.5in;}*{box-sizing:border-box;}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;}'+
    '.sheet{display:grid;grid-template-columns:3.5in 3.5in;grid-auto-rows:2in;gap:0;justify-content:center;}.tag{border:1px dashed #999;padding:0.14in;display:flex;gap:0.14in;align-items:center;break-inside:avoid;overflow:hidden;}'+
    '.qr{width:1.62in;height:1.62in;flex:none;}.qr svg{width:100%;height:100%;display:block;}.tx{min-width:0;line-height:1.2;}.br{font-size:7.5pt;font-weight:700;letter-spacing:1.5px;}.sku{font-size:17pt;font-weight:800;margin:2px 0 1px;}'+
    '.nm{font-size:10pt;font-weight:700;}.ln{font-size:8.5pt;}.sc{font-size:7pt;margin-top:5px;color:#333;}</style></head><body><div class="sheet">'+tags.map(tag).join("")+'</div>'+
    '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},250);};</scr'+'ipt></body></html>';
  w.document.open();w.document.write(html);w.document.close();return true;}
// Itemized parts bought into an engine during reman: [{d,v,date}] on the record
const partsSpend=i=>(i.partsLog||[]).reduce((a,p)=>a+(+p.v||0),0);
// Total landed+reman cost basis: the breakdown + itemized parts + diagnosis parts + auto labor.
// The flat `cost` is what the engine or core cost to buy, so it stands in for Core when Core is blank:
// entering freight adds to it, and logging a $50 part never drops the basis to $50.
const fixedCost=i=>(+i.costCore||+i.cost||0)+(+i.costFreight||0)+(+i.costParts||0)+(+i.costLabor||0);
const costBasis=i=>fixedCost(i)+partsSpend(i)+(+i.laborLogged||0)+(+i.dxParts||0);
// ── Diagnosis history + common-issues knowledge base ──
const SYMPTOMS=["Hard start","No start","Low power","Rough idle","Misfire","White smoke","Black smoke","Blue smoke","Overheating","Coolant loss","Coolant in oil","Fuel in oil","Oil consumption","Low oil pressure","Knock / noise","Excessive blowby","Turbo / boost","EGR / aftertreatment","Derate / fault codes","Electrical"];
const DX_OUTCOMES=[["open","Open"],["monitoring","Monitoring"],["resolved","Resolved"]];
const SEVERITIES=[["high","High"],["medium","Medium"],["low","Low"]];
// Model family tokens (longest first so ISX15 wins over ISX). An engine's
// family key is the first token found in its normalized name.
const FAMILIES=["MAXXFORCE13","MAXXFORCE11","MAXXFORCEDT","60SERIES","SERIES60","50SERIES","SERIES50","ISX15","X15","ISX12","ISX","ISB","ISL","ISC","ISM","N14","DD13","DD15","DD16","DT466","T444E","A26","3116","3126","3406","C15","C13","C7","C33","PX8","PX6","PX7","MX13","MX11","MP7","MP8","VED12","D13","D11","OM906","OM926","OM9","FORD67","GM65","4JJ1","W04","6081","M53","4034","1212","YANMAR","DEUTZ","PERKINS","KUBOTA"];
const normM=t=>String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const familyKey=i=>{const n=normM(i&&i.name);return FAMILIES.find(f=>n.includes(f))||n.replace(/\d{4}$/,"")||"?";};
const FAM_LABEL={"60SERIES":"Series 60",SERIES60:"Series 60",FORD67:"Ford 6.7",GM65:"GM 6.5",MAXXFORCEDT:"MaxxForce DT",MAXXFORCE13:"MaxxForce 13",MAXXFORCE11:"MaxxForce 11",YANMAR:"Yanmar",DEUTZ:"Deutz",PERKINS:"Perkins",KUBOTA:"Kubota"};
const famLabel=k=>FAM_LABEL[k]||k;
const familyLabel=i=>{const k=familyKey(i);return k==="?"?(i.name||""):famLabel(k);};
// Does a common issue apply to this engine? models:[] = applies to every engine.
const issueFits=(is,i)=>{const ms=is.models||[];if(!ms.length)return true;const n=normM(i&&i.name);return ms.some(m=>m&&n.includes(normM(m)));};
const issuesFor=(s,i)=>(s.issues||[]).filter(is=>issueFits(is,i));
const dxFor=(s,id)=>(s.diagnoses||[]).filter(x=>+x.engineId===+id).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id);
const engById=(s,id)=>(s.inventory||[]).find(x=>x.id===+id);
// Prior diagnoses on the same engine family that share at least one symptom
const dxMatches=(s,eng,symptoms,exceptId)=>{if(!eng||!(symptoms||[]).length)return[];const fk=familyKey(eng);return(s.diagnoses||[]).filter(x=>x.id!==exceptId&&(x.symptoms||[]).some(y=>symptoms.includes(y))).filter(x=>{const e=engById(s,x.engineId);return e&&familyKey(e)===fk;});};
const sevCol=v=>v==="high"?"var(--r)":v==="low"?"var(--g)":"var(--w)";
// ── Bill of materials: the long block parts order + decision sheet ──
// A template (s.boms) is the shop's paper form for one engine family; a sheet
// (s.bomSheets, one per engine) is that form filled in for one core. Two kinds
// of line, mirroring the form's two pages:
//   order  — always new, ordered the day the job opens, never ticked. Struck
//            out (d:"skip") when it is not going on this job.
//   decide — REUSE (measured, in spec, number written down) · MISS (not there
//            when opened — money back on the core) · MACH (machine shop).
//            Blank means REPLACE once the tech signs the sheet off
//            (sh.decidedAt); until then a blank is simply undecided.
// Older tier-based templates read as tier 1 → order, anything else → decide,
// and a legacy d:"repl" reads as blank.
const DISPO=[["reuse","REUSE","var(--g)"],["miss","MISS","var(--r)"],["mach","MACH","var(--b)"]];
const WHY={order:["ORDER","var(--act)"],repl:["REPLACE","var(--w)"],miss:["MISSING","var(--r)"]};
const lineKind=l=>(l&&l.kind)||(l&&l.tier===1?"order":"decide");
const dispoCol=v=>(DISPO.find(x=>x[0]===v)||[])[2]||"var(--mt)";
const dispoLabel=v=>(DISPO.find(x=>x[0]===v)||[])[1]||"";
const bomFits=(b,i)=>{const ms=b.match||[];if(!ms.length)return true;const n=normM(i&&i.name);return ms.some(m=>m&&n.includes(normM(m)));};
const bomsFor=(s,i)=>(s.boms||[]).filter(b=>bomFits(b,i));
const bomById=(s,id)=>(s.boms||[]).find(b=>b.id===+id);
const sheetFor=(s,id)=>(s.bomSheets||[]).find(x=>+x.engineId===+id);
const sheetRow=(sh,lid)=>((sh&&sh.rows)||{})[lid]||{};
const rowD=(sh,l)=>{const v=sheetRow(sh,l.id).d||"";return v==="repl"?"":v;};
// Nothing is pre-ticked: order lines are ordered by default, and a decision
// left blank means replace once the sheet is signed off.
const newRows=()=>({});
const bomStats=(b,sh)=>{const ls=(b&&b.lines)||[];const c={order:0,skip:0,decide:0,reuse:0,miss:0,mach:0,repl:0,open:0,total:ls.length,signed:!!(sh&&sh.decidedAt),ordered:!!(sh&&sh.orderedDate)};ls.forEach(l=>{const v=rowD(sh,l);if(lineKind(l)==="order"){if(v==="skip")c.skip++;else c.order++;}else{c.decide++;if(v==="reuse")c.reuse++;else if(v==="miss")c.miss++;else if(v==="mach")c.mach++;else if(c.signed)c.repl++;else c.open++;}});c.ticked=c.reuse+c.miss+c.mach;return c;};
const bomPick=(b,sh,v)=>((b&&b.lines)||[]).filter(l=>lineKind(l)==="decide"&&rowD(sh,l)===v);
// Everything to buy for one engine, tagged with why: the day-one order, what
// was missing from the core, and what the signed-off decision sheet left blank.
const bomBuy=(b,sh)=>{const out=[];const signed=!!(sh&&sh.decidedAt);((b&&b.lines)||[]).forEach(l=>{const v=rowD(sh,l);if(lineKind(l)==="order"){if(v!=="skip")out.push({l,why:"order"});}else if(v==="miss")out.push({l,why:"miss"});else if(!v&&signed)out.push({l,why:"repl"});});return out;};
const bomSecs=b=>[...new Set(((b&&b.lines)||[]).map(l=>l.sec))];
// Search string for a buy link: a known part number beats the family name.
const buyQ=(b,l,pn)=>{const nm=String(l.part||"").replace(/[—–]/g," ").replace(/\s+/g," ").trim();const t=String(pn||"").trim();return encodeURIComponent(t?t+" "+nm:(b?((b.family||"")+" "+(b.model||"")+" ").replace(/\s+/g," "):"")+nm);};
const buyUrl=(v,q)=>safeUrl(String(v.search||"").replace("{q}",q))||undefined;
const bomCost=(b,sh)=>bomBuy(b,sh).reduce((a,z)=>a+(+sheetRow(sh,z.l.id).cost||0),0);
// ── ECM programming / tuning jobs ──
// Parameter programming, factory calibration updates, ECM replacement/setup,
// injector trim codes, post-swap setup and emissions-intact tunes ONLY. There is
// deliberately no "delete" job type and no field that records removing or
// disabling EGR / DPF / SCR. All three are checked at intake (emisIn) and at
// release (emisOut): a "no" anywhere puts the job On Hold (holdReason
// "emissions") until it's fixed, work can't start without a passed intake check,
// and a job can't complete without passed checks at both ends plus the
// customer's sign-off. ecmGuard enforces this inside the reducer, so no screen
// can get around it.
const ECM_TYPES=[["param","Parameter programming"],["cal","Factory calibration update"],["ecm","ECM replacement / setup"],["trim","Injector trim codes"],["swap","Post-engine-swap setup"],["tune","Emissions-intact performance / economy tune (third-party)"],["diag","Diagnostics only"]];
const ecmTypeLabel=t=>(ECM_TYPES.find(x=>x[0]===t)||[t,t])[1];
const ECM_ST=[["intake","Intake"],["baseline","Baseline"],["in-progress","In progress"],["verify","Verify"],["complete","Complete"]];
const ecmStLabel=st=>st==="on-hold"?"On hold":((ECM_ST.find(x=>x[0]===st)||[])[1]||st||"Intake");
const ECM_GOALS=[["fuel","Fuel economy"],["hills","Power on hills"],["fault","Fix a fault / derate"],["swap","After an engine swap"],["fleet","Fleet speed / idle settings"],["other","Other"]];
const ECM_APPS=["Highway","Regional","Vocational / dump","Ag / grain","Oilfield","Livestock","Logging"];
const ECM_TERRAIN=["Flat","Rolling","Mountain"];
const ECM_TRANS=["Manual","Eaton automated","Detroit DT12","Volvo I-Shift","Allison","Other"];
const ECM_TOOLS=["Cummins INSITE","Detroit DiagnosticLink","PACCAR DAVIE","Cat ET","Volvo / Mack Premium Tech Tool","Noregon JPRO","Other"];
const EMIS=[["egr","EGR"],["dpf","DPF"],["scr","SCR"]];
// The truck engines we program first, then the rest of the shop's families.
const ECM_FAMS=[["ISX15","Cummins ISX15"],["X15","Cummins X15"],["ISX12","Cummins ISX12"],["ISX","Cummins ISX (CM870/871)"],["DD13","Detroit DD13"],["DD15","Detroit DD15"],["DD16","Detroit DD16"],["60SERIES","Detroit Series 60"],["MX13","PACCAR MX-13"],["MX11","PACCAR MX-11"],["D13","Volvo D13"],["MP7","Mack MP7"],["MP8","Mack MP8"],["C15","Cat C15"],["C13","Cat C13"],["MAXXFORCE13","International MaxxForce 13"],["A26","International A26"]];
const ECM_BRANDS={Cummins:["ISX15","X15","ISX12","ISX","ISB","ISL","ISC","ISM","N14"],Detroit:["DD13","DD15","DD16","60SERIES","SERIES60"],PACCAR:["MX13","MX11","PX8","PX7","PX6"],Volvo:["D13","D11","VED12"],Mack:["MP7","MP8"],Cat:["C15","C13","C7","C33","3406","3126","3116"],International:["MAXXFORCE13","MAXXFORCE11","MAXXFORCEDT","A26","DT466","T444E"]};
const ecmBrand=k=>Object.keys(ECM_BRANDS).find(b=>ECM_BRANDS[b].includes(k))||"";
const ecmFamLabel=k=>!k||k==="?"?"Not set":(ECM_FAMS.find(x=>x[0]===k)||[])[1]||((ecmBrand(k)?ecmBrand(k)+" ":"")+famLabel(k));
const ecmFamOf=e=>{const k=familyKey(e);return FAMILIES.includes(k)?k:"";};
// Customer-programmable settings the tech can tap into the change table. Names
// are close to each maker's service-tool wording and stay editable. Nothing that
// touches aftertreatment is on any list.
const ECM_PARAMS_BASE=["Road speed limit","Cruise control max speed","Idle shutdown time","Idle shutdown override","Low idle speed","Engine brake settings","PTO settings","Gear-down protection","Progressive shift","Fan control","Rating / HP selection","Tire revs per km","Rear axle ratio"];
const ECM_PARAMS={Cummins:["Max vehicle speed","Cruise control max speed","Road speed governor droop","Idle shutdown time","Idle shutdown override","Low idle speed","Engine brake: min vehicle speed","Engine brake in cruise","Gear-down protection","Progressive shift: low gear","Progressive shift: high gear","Fan control","PTO max engine speed","Rating selection","Tire revs per km","Rear axle ratio"],Detroit:["Vehicle speed limit","Cruise control max speed","Idle shutdown timer","Idle shutdown override","Low idle speed","Engine brake mode","Engine brake in cruise","PTO max engine speed","Gear-down protection","Progressive shift","Fan control","Rating selection","Tire revs per km","Rear axle ratio"],Cat:["Vehicle speed limit","Cruise control max speed","Idle shutdown time","Low idle speed","Engine retarder mode","PTO configuration","Gear-down protection","Progressive shift","Fan configuration","Rating number","Tire revs per km","Rear axle ratio"]};
const ecmParamPresets=k=>ECM_PARAMS[ecmBrand(k)]||ECM_PARAMS_BASE;
const ecmBlank=()=>({goals:[],types:[],params:[],bFaults:[],aFaults:[],parts:[],trims:["","","","","",""],emisIn:{},emisOut:{},fu:{},billTo:"customer"});
// The emissions rule.
const ecmEm=(j,k,e)=>(((j&&j[k])||{})[e]||{});
const ecmEmisNo=j=>["emisIn","emisOut"].some(k=>EMIS.some(([e])=>ecmEm(j,k,e).ok==="no"));
const ecmEmisOk=(j,k)=>EMIS.every(([e])=>ecmEm(j,k,e).ok==="yes");
const ecmMissing=j=>{const m=[];if(!ecmEmisOk(j,"emisIn"))m.push("the intake emissions check");if(!ecmEmisOk(j,"emisOut"))m.push("the release emissions check");if(!truthy(j.signOk)||!String(j.signName||"").trim())m.push("the customer's sign-off");return m;};
const ECM_WORK=["in-progress","verify","complete"];
// Normalise a job about to be saved: returns the job as it may be stored plus a message for the toast.
const ecmGuard=(prev,next)=>{let j={...next},msg=null;const p=prev||{};
  if(ecmEmisNo(j)){const was=p.status==="on-hold"&&p.holdReason==="emissions";const from=was?p.holdFrom:(p.status&&p.status!=="on-hold"?p.status:(p.holdFrom||"intake"));
    if(!was)msg="⛔ On hold: emissions issue. EGR, DPF and SCR must all be present and working before this job goes any further.";else if(next.status!==p.status)msg="⛔ Still on hold: fix the emissions issue first.";
    j={...j,status:"on-hold",holdReason:"emissions",holdFrom:from==="complete"?"verify":(from||"intake")};return{j,msg};}
  if(j.status==="on-hold"&&j.holdReason==="emissions"){j={...j,status:j.holdFrom||"intake",holdReason:"",holdFrom:""};msg="✓ Emissions checks pass. Job back to "+ecmStLabel(j.status)+".";}
  if(ECM_WORK.includes(j.status)&&j.status!==p.status&&!ecmEmisOk(j,"emisIn")){j={...j,status:p.status&&!ECM_WORK.includes(p.status)&&p.status!=="on-hold"?p.status:"baseline"};msg="Do the intake emissions check first: EGR, DPF and SCR present and working.";}
  else if(j.status==="complete"&&p.status!=="complete"){const miss=ecmMissing(j);if(miss.length){j={...j,status:p.status&&p.status!=="complete"?p.status:"verify"};msg="Can't complete yet. Still needed: "+miss.join(", ")+".";}else j={...j,completedAt:j.completedAt||isoToday()};}
  return{j,msg};};
const ecmCust=(s,j)=>j.custId?cn(s.customers,+j.custId):(j.engineId?"Shop · our engine":"—");
const ecmJobLabel=(s,j)=>[j.custId?cn(s.customers,+j.custId):(j.engineId?"Shop · our engine":""),j.unit?"unit "+j.unit:"",j.family?ecmFamLabel(j.family):""].filter(Boolean).join(" · ")||"ECM job";
const ecmDue=(base,n)=>{const dt=new Date((base||isoToday())+"T12:00:00");dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10);};
// 30 / 60 / 90-day follow-ups booked on the Schedule when a job completes (never twice).
const ecmFollowups=(s,j)=>{const have=(s.schedule||[]).filter(a=>+a.ecmJobId===j.id).map(a=>+a.fuDay);const base=j.completedAt||isoToday();const add=[30,60,90].filter(n=>!have.includes(n)).map((n,k)=>({id:Date.now()+20+k,date:ecmDue(base,n),time:"",duration:30,custId:+j.custId||0,service:"ECM follow-up · "+n+" days"+(j.unit?" · unit "+j.unit:""),tech:j.tech||"Unassigned",status:"pending",ecmJobId:j.id,fuDay:n,auto:true,notes:"Record fuel economy (L/100 km), regen frequency, any new faults and customer comments on the ECM job."}));return add.length?[...(s.schedule||[]),...add]:s.schedule;};
// Money. The posted price list is settings.ecmPrices {type: flat price}. A job's
// price is the sum of its ticked types, or the tech's override (with a reason).
// Parts are billed on top. Hours × tech pay are the job's cost, never a charge.
const ecmPrices=s=>getSet(s).ecmPrices||{};
const ecmSuggest=(s,j)=>(j.types||[]).reduce((a,t)=>a+(+ecmPrices(s)[t]||0),0);
const ecmOver=j=>j.priceOverride!=null&&String(j.priceOverride).trim()!==""&&!isNaN(+j.priceOverride);
const ecmService=(s,j)=>ecmOver(j)?+j.priceOverride:ecmSuggest(s,j);
const ecmPartsSum=j=>(j.parts||[]).reduce((a,p)=>a+(+p.v||0),0);
const ecmLabour=j=>(+j.hours||0)*(+j.rate||0);
// The invoice that billed a job, if it still exists (deleting it un-bills the job; undo re-links it).
const ecmInv=(s,j)=>(j&&j.invoiceId&&(s.invoices||[]).find(x=>x.id===+j.invoiceId))||null;
const ecmCharge=(s,j)=>j.billTo==="warranty"?0:ecmInv(s,j)?(+j.billed||0):ecmService(s,j)+ecmPartsSum(j);
const ecmBillLines=(s,j)=>{const pr=ecmPrices(s);const ts=j.types||[];const L=(ecmOver(j)||!ts.length)?[{d:"ECM service"+(ts.length?" — "+ts.map(ecmTypeLabel).join(", "):""),q:1,r:ecmService(s,j),ecmJobId:j.id}]:ts.map(t=>({d:"ECM — "+ecmTypeLabel(t),q:1,r:+pr[t]||0,ecmJobId:j.id}));(j.parts||[]).filter(p=>String(p.d||"").trim()||+p.v).forEach(p=>L.push({d:"Part — "+(String(p.d||"").trim()||"part"),q:1,r:+p.v||0,ecmJobId:j.id}));return L;};
// Service revenue split across a job's types by their posted prices (evenly when unpriced).
const ecmTypeShares=(s,j)=>{const ts=j.types||[];if(!ts.length||j.billTo==="warranty")return{};const svc=ecmInv(s,j)?Math.max(0,(+j.billed||0)-ecmPartsSum(j)):ecmService(s,j);const pr=ecmPrices(s);const w=ts.map(t=>+pr[t]||0);const tw=w.reduce((a,b)=>a+b,0);const o={};ts.forEach((t,k)=>{o[t]=tw>0?svc*w[k]/tw:svc/ts.length;});return o;};
const ecmFor=(s,engineId)=>(s.ecmJobs||[]).filter(j=>+j.engineId===+engineId).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id);
const ecmFilesFor=(s,jobId)=>(s.ecmFiles||[]).filter(x=>+x.jobId===+jobId);
const fmtBytes=n=>n>=1073741824?(Math.round(n/1073741824*10)/10)+" GB":n>=1048576?(n/1048576).toFixed(1)+" MB":n>=1024?Math.round(n/1024)+" KB":(n||0)+" B";
const ecmWarranty=(s,eng)=>{if(!eng)return null;const ws=(s.warranties||[]).filter(w=>+w.engineId===eng.id);const act=ws.find(w=>w.status==="active"&&(!w.expiryDate||w.expiryDate>=isoToday()));return act?{on:true,w:act}:ws.length?{on:false,w:ws[ws.length-1]}:null;};
// Fuel economy is L/100 km, so a negative change is an improvement.
const fuelChg=(b,a)=>{b=+b;a=+a;return b>0&&a>0?(a-b)/b*100:null;};
const ecmNextFu=(s,j)=>{if(j.status!=="complete")return null;const n=[30,60,90].find(k=>!(((j.fu||{})[k]||{}).date));if(!n)return null;const ap=(s.schedule||[]).find(a=>+a.ecmJobId===j.id&&+a.fuDay===n);return{n,date:ap?ap.date:ecmDue(j.completedAt,n)};};
// AI review: explain and flag only. Sent as the system prompt AND repeated in the
// message, so it holds even on an ai function deployed before system prompts.
const ECM_AI_RULES="You review heavy-duty diesel ECM job data for a truck repair shop. Explain and flag only. Never suggest calibration values, fuel or timing numbers, boost or torque targets, parameter values, or anything that removes, disables, bypasses or works around EGR, DPF, SCR or any other emissions equipment. If the data seems to call for any of that, say it is outside what you do and recommend repairing the emissions system. Plain language a truck owner understands. Keep it short.";
const ecmSummary=(s,j)=>{const L=[];const kv=(l,v)=>{if(v!=null&&String(v).trim()!=="")L.push(l+": "+v);};const jn=(...a)=>a.filter(Boolean).join(", ");
  kv("Engine",j.family?ecmFamLabel(j.family):"");kv("Rating",[j.hp&&j.hp+" HP",j.tq&&j.tq+" lb-ft"].filter(Boolean).join(" / "));kv("Truck",[j.year,j.make,j.model].filter(Boolean).join(" "));kv("Transmission",[j.trans,j.transModel].filter(Boolean).join(" "));kv("Rear axle ratio",j.axle);kv("Tires",j.tire);kv("Typical GVW / load",j.gvw);kv("Application",j.application);kv("Terrain",j.terrain);kv("Odometer (km)",j.odo);kv("Engine hours",j.engHours);
  kv("Customer goals",(j.goals||[]).map(g=>(ECM_GOALS.find(x=>x[0]===g)||[g,g])[1]).join(", ")+(j.goalNotes?" ("+j.goalNotes+")":""));
  const ft=(t,rows)=>{if((rows||[]).length)L.push(t+": "+rows.map(r=>[r.code,r.desc,r.count&&("x"+r.count),r.state==="inactive"?"inactive":"active",r.last&&("last "+r.last)].filter(Boolean).join(" ")).join("; "));};
  const tr=j.trip||{},dp=j.dpf||{};
  ft("Fault codes before",j.bFaults);
  kv("Trip data before",jn(tr.fuel&&tr.fuel+" L/100 km",tr.idle&&tr.idle+"% idle",tr.avgSpd&&tr.avgSpd+" km/h average",tr.topGear&&tr.topGear+"% in top gear",tr.fuelUsed&&tr.fuelUsed+" L fuel used",tr.def&&tr.def+" L DEF used"));
  kv("DPF before",jn(dp.regens&&dp.regens+" regens",dp.regenEvery&&"one every "+dp.regenEvery+" km",dp.lastRegen&&"last "+dp.lastRegen,dp.soot&&dp.soot+"% soot load"));
  const dy=(t,x)=>{x=x||{};kv(t,jn(x.hp&&x.hp+" HP"+(x.hpRpm?" @ "+x.hpRpm+" rpm":""),x.tq&&x.tq+" lb-ft"+(x.tqRpm?" @ "+x.tqRpm+" rpm":""),x.boost&&x.boost+" psi max boost",x.egt&&x.egt+" °C max EGT"));};
  dy("Dyno before",j.dynoB);
  kv("Work done",(j.types||[]).map(ecmTypeLabel).join(", "));
  const ps=(j.params||[]).filter(p=>p.name);if(ps.length)L.push("Parameters changed: "+ps.map(p=>p.name+" "+(p.old||"?")+" → "+(p.new||"?")).join("; "));
  if(j.calNew)kv("Calibration",(j.calOld||j.calCur||"?")+" → "+j.calNew);
  if((j.types||[]).includes("tune"))kv("Third-party tune",[(j.tune||{}).vendor,(j.tune||{}).file,(j.tune||{}).ver].filter(Boolean).join(" "));
  ft("Fault codes after",j.aFaults);dy("Dyno after",j.dynoA);kv("Road test",j.roadTest);
  [30,60,90].forEach(n=>{const x=(j.fu||{})[n]||{};if(x.date)kv(n+"-day follow-up",jn(x.fuel&&x.fuel+" L/100 km",x.regenEvery&&"regen every "+x.regenEvery+" km",x.faults&&"new faults: "+x.faults,x.comments&&"customer: "+x.comments));});
  return L.join("\n");};
const ecmFamSelect=(v,on)=>(<select className="rc-fi" value={v||""} onChange={e=>on(e.target.value)} style={{appearance:"none"}}><option value="">Pick the family…</option><optgroup label="Truck engines">{ECM_FAMS.map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</optgroup><optgroup label="Other families">{FAMILIES.filter(k=>k!=="SERIES60"&&!ECM_FAMS.some(x=>x[0]===k)).map(k=>(<option key={k} value={k}>{ecmFamLabel(k)}</option>))}</optgroup></select>);
// ── Sales research: fleet prospects + competitor shops ──
// Both lists (plus the comparison cheat sheet) ship as research files in src/data.
// They seed ONCE: seedResearch (in loadAll) copies a seed in only when that list
// was never stored or is stored empty, and from then on the stored copy is the
// truth: the seed never overwrites edits. The files load on demand, so they stay
// out of the main bundle. Seed ids are strings ("fleet-001", "comp-001"); records
// added in the app use Date.now(), so look records up with resById, not ===.
const resWork=r=>({status:"",lastContact:"",nextFollowUp:"",contactName:"",contactRole:"",engines:[],truckCount:"",flyerLeft:false,log:[],customerId:null,...r});
const compWork=r=>({myNotes:"",lastChecked:"",prices:[],...resWork(r)});
const SEEDS={
  prospects:[()=>import("./data/fleet-prospects.json"),rows=>rows.map(resWork)],
  competitors:[()=>import("./data/competitors.json"),rows=>rows.map(compWork)],
  compare:[()=>import("./data/competitor-comparison.json"),rows=>rows.map((r,i)=>({id:"cmp-"+String(i+1).padStart(2,"0"),us:/rollin/i.test(r.business||""),...r}))],
};
async function seedResearch(d){const seeded=[];for(const k of Object.keys(SEEDS)){if(Array.isArray(d[k])&&d[k].length)continue;try{const m=await SEEDS[k][0]();d[k]=SEEDS[k][1](m.default||[]);seeded.push(k);}catch(e){console.error("[rc seed] "+k+" failed:",e&&e.message?e.message:e);d[k]=[];}}return seeded;}
const resById=(s,list,id)=>(s[list]||[]).find(x=>String(x.id)===String(id));
// The pipeline. "" is "not contacted" (records start with an empty status).
const PST=[["","Not contacted","var(--mt)"],["contacted","Visited / called","var(--b)"],["interested","Interested","var(--ac)"],["quoted","Quoted","var(--p)"],["customer","Customer","var(--g)"],["not-a-fit","Not a fit","var(--ft)"],["do-not-contact","Do not contact","var(--r)"]];
const pstOf=k=>PST.find(x=>x[0]===(k||""))||PST[0];
// Never followed up, put on a route sheet or on the Daily 3.
const PST_OFF=["not-a-fit","do-not-contact"];
const addDays=(iso,n)=>ecmDue(iso,n);
const fuDue=(r,td)=>!!r.nextFollowUp&&r.nextFollowUp<=(td||isoToday())&&!PST_OFF.includes(r.status||"");
const resFollowups=(s,days)=>{const lim=addDays(isoToday(),days||0);return[...(s.prospects||[]).map(r=>["prospects",r]),...(s.competitors||[]).map(r=>["competitors",r])].filter(([,r])=>r.nextFollowUp&&r.nextFollowUp<=lim&&!PST_OFF.includes(r.status||"")).sort(([,a],[,b])=>String(a.nextFollowUp).localeCompare(String(b.nextFollowUp))||String(a.name).localeCompare(String(b.name)));};
const visited=r=>(r.log||[]).some(e=>e.type==="visit");
// The last real contact (visit, call or email), skipping notes like "Converted to customer".
const lastTouch=r=>(r.log||[]).slice().reverse().find(e=>e.type&&e.type!=="note")||null;
// 93 free-text haul types fold into a handful of groups for filtering.
const HAUL_GROUPS=[["Livestock",/livestock|cattle/i],["Oilfield / water",/\boil|pipeline|\brig|water|\bvac\b/i],["Ag: grain, hay, fertilizer",/grain|fertil|\bhay\b|bale|\bag\b|farm/i],["Construction / gravel",/gravel|sand|topsoil|bobcat|excavat|construct|equipment|aggregate|dump|crush/i],["Bulk / liquid",/bulk|liquid|fuel|chemical|tank/i],["Hotshot / expedited",/hotshot|expedit|express|pilot|courier/i],["General freight / LTL",/ltl|freight|truckload|cartage|truck|transport|logist|general|dedicated|haul|terminal|deck|reefer|\bvan|super b|over-dim/i]];
const haulGroup=h=>(HAUL_GROUPS.find(([,re])=>re.test(h||""))||["Other"])[0];
// "Sells engines?" is free text in the research ("Yes (Cummins ReCon)", "OEM reman (likely)"…).
const sellsGroup=v=>{const t=String(v||"").trim();return /^(yes|oem reman)/i.test(t)?"yes":/^no\b/i.test(t)?"no":"unknown";};
const SELLS_OPTS=["Unknown","Yes","Yes (reman / rebuilt)","Yes (OEM reman)","Yes (used take-outs)","No"];
const PRICING_OPTS=["Not verified","Yes","No","No (website checked)"];
const optsWith=(opts,cur)=>cur&&!opts.includes(cur)?[cur,...opts]:opts;
const THREAT_COL={High:"var(--r)",Medium:"var(--w)",Low:"var(--mt)"};
const SALES_COL={High:"var(--g)",Medium:"var(--b)",Low:"var(--mt)","Supplier?":"var(--p)"};
// Shops with a sales-prospect rating get the same visit / convert actions as fleets.
const isSalesShop=r=>["High","Medium","Low"].includes(r.salesProspect);
// The research files use "—" for "don't know"; treat it as blank everywhere it is shown or linked.
const nb=v=>{const t=String(v??"").trim();return /^[—–-]$/.test(t)?"":t;};
const telHref=p=>"tel:"+nb(p).replace(/[^\d+]/g,"");
const webHref=w=>{const t=nb(w);return !t?"":/^https?:\/\//i.test(t)?t:"https://"+t;};
const mapHref=r=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([nb(r.address),r.city,"Alberta"].filter(Boolean).join(", "));
const townOf=c=>String(c||"").replace(/\s+(area|county)$/i,"").split(" / ")[0].trim();
const kmTxt=r=>r.kmFromMH!==""&&r.kmFromMH!=null?r.kmFromMH+" km":"";
function PBadge({st}){const[,l,c]=pstOf(st);return(<span className="rc-badge" style={{color:c,border:"1px solid "+tint(c,40),background:tint(c,12)}}><span className="rc-bdot" style={{background:c}}/>{l}</span>);}
function Lvl({v,cols}){if(!v)return <span style={{color:"var(--mt)"}}>—</span>;const c=(cols||{})[v]||"var(--mt)";return(<span style={{display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",fontSize:13.5,fontWeight:600,color:c}}><span style={{width:8,height:8,borderRadius:"50%",background:c}}/>{v}</span>);}
// Printable route sheet. Each stop takes two lines (name, address and phone, then
// the pitch) with a notes box and tick boxes beside it, so a full town day fits
// on one Letter page (ROUTE_PAGE stops). With fewer stops the rows grow to give
// the notes box more room. Black and white friendly: borders only, no fills.
const ROUTE_PAGE=28;
function printRoute(stops,title){
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const h=Math.max(30,Math.min(64,Math.floor(830/Math.max(1,stops.length))));
  const stop=(r,x)=>'<tbody><tr><td class="n" rowspan="2">'+(x+1)+(kmTxt(r)?'<small>'+esc(kmTxt(r))+'</small>':"")+'</td><td class="nm">'+esc(r.name)+'</td><td class="ad">'+esc([nb(r.address),r.city].filter(Boolean).join(", "))+'</td><td class="tl">'+(nb(r.phone)?nb(r.phone).split(/\s*\/\s*/).map(x=>'<span>'+esc(x)+'</span>').join(" / "):"—")+'</td><td class="nt" rowspan="2" style="height:'+h+'px"></td><td class="ck" rowspan="2">&#9744; Visited<br>&#9744; Flyer left<br>&#9744; Follow up</td></tr><tr><td class="pi" colspan="3">'+esc(r.pitch||"")+'</td></tr></tbody>';
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Route day — '+esc(title)+'</title>'+SHEET_STYLE+
  '<style>@page{size:letter portrait;margin:9mm;}body{padding:0;}.logo{background:#fff!important;color:#111!important;border:2px solid #111;width:34px;height:34px;font-size:17px;}h1{font-size:20px;}.head{border-bottom:2px solid #111!important;margin-bottom:6px;padding-bottom:5px;}.sub{color:#111!important;}.meta{font-size:10.5px;line-height:1.45;}'+
  '.rt{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #555;}.rt td{border:0;padding:1px 5px 0;vertical-align:top;font-size:9.5px;line-height:1.18;color:#111;}.rt thead td{font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:3px;}'+
  '.rt tbody{break-inside:avoid;}.rt tbody tr:first-child td{border-top:1px solid #555;}.rt tbody:first-of-type tr:first-child td{border-top:0;}.rt .n,.rt .nt,.rt .ck{border-left:1px solid #555;}.rt .n{border-left:0;text-align:center;font-weight:700;font-size:11px;}.rt .n small{display:block;font-weight:400;font-size:7.5px;color:#444;white-space:nowrap;}'+
  '.rt .nm{font-weight:700;font-size:10.5px;}.rt .tl{font-variant-numeric:tabular-nums;}.rt .tl span{white-space:nowrap;}.rt .pi{font-style:italic;font-size:9px;color:#333;padding-bottom:2px;}.rt .ck{font-size:8px;line-height:1.15;padding-top:2px;white-space:nowrap;}.foot{border-top:0;margin-top:6px;color:#444;}</style></head><body>'+
  '<div class="head"><div class="brand"><div class="logo">RC</div><div><h1>Route Day</h1><div class="sub">'+esc(title)+' &middot; '+stops.length+' stop'+(stops.length===1?"":"s")+'</div></div></div><div class="meta"><strong>Rollin Coal</strong><br>'+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+'<br>1-587-863-0505 &middot; rollin-coal.ca</div></div>'+
  '<table class="rt"><colgroup><col style="width:4.5%"><col style="width:29%"><col style="width:22%"><col style="width:11.5%"><col><col style="width:8.5%"></colgroup><thead><tr><td class="n">#</td><td class="nm">Fleet / pitch</td><td>Address</td><td>Phone</td><td class="nt">Notes</td><td class="ck">Done</td></tr></thead>'+stops.map(stop).join("")+'</table>'+
  '<div class="foot"><span>Priority A fleets not yet visited, nearest first.</span><span>Log each visit in the dashboard the same day.</span></div>'+
  '<scr'+'ipt>window.onload=function(){var go=function(){setTimeout(function(){window.print();},200);};if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go,go);else go();};</scr'+'ipt></body></html>';
  const w=window.open("","_blank","width=920,height=1080");if(!w)return;
  w.document.open();w.document.write(html);w.document.close();
}
// Underwater build detection: cost creeping up on the expected sale price (WIP stages only)
const UW_WARN=.75,UW_CRIT=.9;
const uwRatio=i=>{const p=+i.price||0,cb=costBasis(i);return p>0&&cb>0?cb/p:null;};
const uwLevel=i=>{if(!["core","in-reman","on-hold"].includes(engStatus(i)))return null;const r=uwRatio(i);return r==null?null:r>=UW_CRIT?"crit":r>=UW_WARN?"warn":null;};
// Where the buyer came from — tagged on the SOLD splash or the wins feed
const SALE_SRC=[["facebook","FB"],["kijiji","Kijiji"],["marketbook","MarketBook"],["repeat","Repeat"],["word","Word of mouth"]];
const srcLabel=k=>(SALE_SRC.find(x=>x[0]===k)||[k,k])[1];
// Daily 3 shift card: deal 3 real tasks from live data; tasks complete
// themselves when the underlying condition is fixed in the app.
function genDaily3(s){
  const c=[];const E=(s.inventory||[]).filter(isEngine);
  E.filter(i=>costBasis(i)<=0).forEach(i=>c.push({t:"cost",id:i.id,l:"💲 Enter core cost — "+(i.sku||i.name||"")}));
  E.filter(i=>engStatus(i)==="available"&&!(i.listedOn||[]).length).forEach(i=>c.push({t:"list",id:i.id,l:"📣 Post "+(i.sku||"")+" — not advertised"}));
  E.filter(i=>!i.photo).forEach(i=>c.push({t:"photo",id:i.id,l:"📷 Photo "+(i.sku||i.name||"")}));
  E.filter(i=>!(i.serial||i.esn)).forEach(i=>c.push({t:"esn",id:i.id,l:"🔢 Record ESN — "+(i.sku||i.name||"")}));
  E.filter(i=>["core","in-reman","on-hold"].includes(engStatus(i))&&i.stageDate&&Date.now()-new Date(i.stageDate).getTime()>7*864e5).forEach(i=>c.push({t:"stale",id:i.id,l:"⏳ Touch "+(i.sku||i.name||"")+" — stuck in "+engStatusLabel(engStatus(i))}));
  (s.invoices||[]).filter(v=>Mny.isOverdue(v)).forEach(v=>c.push({t:"inv",id:v.id,l:"💰 Chase invoice "+(v.invNum||v.id)}));
  resFollowups(s,0).forEach(([list,r])=>c.push({t:"follow",id:r.id,list,l:"📞 Follow up — "+(r.name||"")+(r.city?" ("+r.city+")":"")}));
  const day=Math.floor(Date.now()/864e5);const types=[...new Set(c.map(x=>x.t))];const picks=[];
  for(let k=0;k<types.length&&picks.length<3;k++){const ty=types[(k+day)%types.length];const cand=c.find(x=>x.t===ty&&!picks.includes(x));if(cand)picks.push(cand);}
  for(const x of c){if(picks.length>=3)break;if(!picks.includes(x))picks.push(x);}
  return picks.slice(0,3);
}
const d3Done=(s,t)=>{const gi=id=>(s.inventory||[]).find(x=>x.id===id);switch(t.t){
  case "cost":{const i=gi(t.id);return !i||costBasis(i)>0;}
  case "list":{const i=gi(t.id);return !i||engStatus(i)!=="available"||(i.listedOn||[]).length>0;}
  case "photo":{const i=gi(t.id);return !i||!!i.photo;}
  case "esn":{const i=gi(t.id);return !i||!!(i.serial||i.esn);}
  case "stale":{const i=gi(t.id);return !i||!["core","in-reman","on-hold"].includes(engStatus(i))||!i.stageDate||Date.now()-new Date(i.stageDate).getTime()<=7*864e5;}
  case "inv":{const v=(s.invoices||[]).find(x=>x.id===t.id);return !v||!Mny.isOverdue(v);}
  case "follow":{const r=resById(s,t.list,t.id);return !r||!fuDue(r,isoToday());}
  default:return false;}};
// Velocity from stage history: days first-stage→available (build), available→sold (sell)
const velo=i=>{const lg=i.stageLog||[];const first=st=>{const e=lg.find(x=>x.st===st);return e?new Date(e.ts).getTime():null;};const acq=lg.length?new Date(lg[0].ts).getTime():null;const av=first("available");const so=i.soldDate?new Date(i.soldDate+"T12:00:00").getTime():first("sold");return{build:acq!=null&&av!=null&&av>acq?(av-acq)/864e5:null,sell:av!=null&&so!=null&&so>=av?(so-av)/864e5:null};};
const trueMargin=i=>(+i.price||0)-costBasis(i);
const marginPct=i=>i.price>0?(trueMargin(i)/i.price*100):0;
// Resolve records linked to an engine by engineId
const engLinks=(s,id)=>({
  invoice:(s.invoices||[]).find(x=>sameId(x.engineId,id)),
  core:(s.cores||[]).find(x=>sameId(x.engineId,id)),
  warranty:(s.warranties||[]).find(x=>sameId(x.engineId,id)),
  shipment:(s.shipments||[]).find(x=>sameId(x.engineId,id)),
});
// Advertising channels for the 1-post funnel
const CHANNELS=[
  {k:"facebook",l:"Facebook",ab:"FB",col:"var(--b)",url:"https://www.facebook.com/marketplace/create/item"},
  {k:"kijiji",l:"Kijiji",ab:"KJ",col:"var(--g)",url:"https://www.kijiji.ca/p-post-ad.html"},
  {k:"marketbook",l:"MarketBook",ab:"MB",col:"var(--ac)",url:"https://www.marketbook.ca/"},
];
const chan=k=>CHANNELS.find(c=>c.k===k)||{l:k,ab:k,col:"var(--tx2)"};
const today=()=>new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
const isoToday=()=>{const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().split("T")[0];};
// Shop settings live as a single row in the settings list
const getSet=s=>((s.settings||[])[0])||{};
// One-click JSON backup of every persisted list
function exportBackup(s){try{const data={exported:new Date().toISOString(),app:"rollin-coal-dashboard",lists:{}};STORE_KEYS.forEach(k=>{data.lists[k]=s[k]||[];});const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="rollin-coal-backup-"+isoToday()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}catch(e){console.error("backup failed:",e);}}
// Website export: buyer-facing listing text/HTML for one engine — main
// details, price, photo only. Never includes costs, parts log, or margins.
function listingText(i){const L=[];L.push((i.name||"Engine").toUpperCase());const id=[];if(i.serial||i.esn)id.push("ESN "+(i.serial||i.esn));if(i.sku)id.push("SKU "+i.sku);if(id.length)L.push(id.join(" · "));const sp=[];if(i.year)sp.push("Year: "+i.year);if(i.ratedHp)sp.push("Rated HP: "+i.ratedHp);if(i.oilCap)sp.push("Oil capacity: "+i.oilCap);if(i.arrangement)sp.push("Arrangement: "+i.arrangement);if(sp.length)L.push(sp.join(" · "));if(i.condition)L.push("Condition: "+i.condition);if(i.notes)L.push("",i.notes);L.push("","Price: "+(+i.price>0?$$(+i.price)+" CAD":"Call for pricing"));L.push("","Rollin Coal — Canada's Diesel Engine Specialists","Medicine Hat, AB · 1-587-863-0505 · rollin-coal.ca");return L.join("\n");}
function listingHtml(i){const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");const photo=i.photo?(i.photo.startsWith("/")?window.location.origin+i.photo:i.photo):"";let h="";if(photo)h+='<img src="'+esc(photo)+'" alt="'+esc(i.name)+'" style="max-width:480px;width:100%;border-radius:8px">\n';h+="<h2>"+esc(i.name)+"</h2>\n<ul>\n";if(i.serial||i.esn)h+="<li><b>ESN:</b> "+esc(i.serial||i.esn)+"</li>\n";if(i.year)h+="<li><b>Year:</b> "+esc(i.year)+"</li>\n";if(i.ratedHp)h+="<li><b>Rated HP:</b> "+esc(i.ratedHp)+"</li>\n";if(i.oilCap)h+="<li><b>Oil capacity:</b> "+esc(i.oilCap)+"</li>\n";if(i.condition)h+="<li><b>Condition:</b> "+esc(i.condition)+"</li>\n";h+="</ul>\n";if(i.notes)h+="<p>"+esc(i.notes)+"</p>\n";h+="<p><b>Price: "+(+i.price>0?$$(+i.price)+" CAD":"Call for pricing")+"</b></p>\n<p>Rollin Coal — Canada's Diesel Engine Specialists · Medicine Hat, AB · 1-587-863-0505</p>";return h;}
// Only web addresses (and the app's own paths) are ever fetched, opened or linked: a "javascript:" link pasted
// into a photo or supplier field would otherwise run inside the dashboard with the viewer's login.
const safeUrl=u=>{const t=String(u||"").trim();return /^(https?:\/\/|\/(?!\/)|blob:|data:image\/)/i.test(t)?t:"";};
async function downloadPhoto(raw,name){const u=safeUrl(raw);if(!u)return;try{const abs=u.startsWith("/")?window.location.origin+u:u;const r=await fetch(abs);const b=await r.blob();const o=URL.createObjectURL(b);const a=document.createElement("a");a.href=o;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(o),3000);}catch(e){try{window.open(u,"_blank");}catch(e2){}}}
// The printed sheets' shared stylesheet (engine build sheet, ECM job sheet).
const SHEET_STYLE='<style>@import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap");'+
  '@page{size:letter portrait;margin:14mm 13mm;}*{box-sizing:border-box;}body{font-family:"IBM Plex Mono",monospace;color:#151515;margin:0;padding:26px;font-size:13.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'+
  '.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #d4581a;padding-bottom:10px;margin-bottom:14px;}.brand{display:flex;align-items:center;gap:12px;}.logo{width:44px;height:44px;background:#d4581a;color:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:21px;}h1{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:24px;letter-spacing:2px;text-transform:uppercase;margin:0;line-height:1;}.sub{font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:#d4581a;font-weight:600;margin-top:3px;}.meta{text-align:right;font-size:11.5px;color:#555;line-height:1.6;}'+
  '.tt{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;}.en{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:26px;line-height:1.05;}.esn{font-size:12px;color:#666;margin-top:3px;}.st{display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 10px;border-radius:10px;border:1.4px solid #333;margin-top:6px;}.ph{width:170px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc;}'+
  '.ig{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 14px;border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:14px;}.il{font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#888;}.iv{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:15.5px;}'+
  'h2{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:15.5px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 6px;padding-left:9px;border-left:4px solid #d4581a;}'+
  'table{width:100%;border-collapse:collapse;}td{padding:5px 8px;border-bottom:1px solid #e5e5e5;font-size:13px;}.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600;}.ind{padding-left:16px;color:#555;font-size:12px;}.dt{color:#aaa;font-size:10.5px;}tr.part td{padding:3.5px 8px;}tr.sub td{font-weight:700;background:#faf5f0;}tr.tot td{font-weight:800;font-size:14.5px;border-top:2px solid #333;border-bottom:none;background:#fdf1e8;}.dim{color:#999;font-style:italic;}'+
  '.pr{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px;}.pc{border:1.4px solid #ddd;border-radius:8px;padding:10px 12px;text-align:center;}.pc .il{margin-bottom:3px;}.pc .v{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:22px;}.g{color:#1e7a34;}.r{color:#b3261e;}.o{color:#d4581a;}'+
  '.uw{border:1.6px solid #b3261e;background:#fdf0ee;color:#b3261e;border-radius:8px;padding:8px 12px;font-size:12.5px;font-weight:600;margin-top:12px;}'+
  '.notes{font-size:12.5px;color:#444;border:1px dashed #ccc;border-radius:8px;padding:9px 12px;margin-top:12px;}'+
  '.foot{margin-top:20px;font-size:10.5px;color:#999;display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:8px;}'+
  '</style>';
// Print the ECM job sheet (new window → print): truck, baseline, every parameter
// changed old → new, before/after numbers, both emissions checks, sign-off line.
function printEcm(s,j){
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const idcell=(l,v)=>'<div><div class="il">'+l+'</div><div class="iv">'+esc(v||"—")+'</div></div>';
  const row=(l,v)=>(v!=null&&String(v).trim()!=="")?'<tr><td>'+l+'</td><td class="num">'+esc(v)+'</td></tr>':"";
  const cust=j.custId?cn(s.customers,+j.custId):"—";const eng=j.engineId?engById(s,j.engineId):null;const war=ecmWarranty(s,eng);
  const faults=rows=>(rows||[]).length?'<table><tr class="th"><td>Code</td><td>Description</td><td>Count</td><td>Last seen</td><td>State</td></tr>'+rows.map(r=>'<tr><td><b>'+esc(r.code)+'</b></td><td>'+esc(r.desc)+'</td><td>'+esc(r.count)+'</td><td>'+esc(r.last)+'</td><td>'+(r.state==="inactive"?"Inactive":"Active")+'</td></tr>').join("")+'</table>':'<div class="dim">None recorded.</div>';
  const tr=j.trip||{},dp=j.dpf||{},b=j.dynoB||{},a=j.dynoA||{};
  const dyRow=(l,k,u,lowGood)=>(b[k]||a[k])?'<tr><td>'+l+'</td><td class="num">'+esc(b[k]||"—")+(b[k]?u:"")+'</td><td class="num">'+esc(a[k]||"—")+(a[k]?u:"")+'</td><td class="num">'+((+b[k]&&+a[k])?((x=>'<span class="'+((lowGood?x<=0:x>=0)?"g":"r")+'">'+(x>0?"+":"")+Math.round(x*10)/10+u+'</span>')(+a[k]-+b[k])):"")+'</td></tr>':"";
  const dyno=dyRow("Peak HP","hp","")+dyRow("Peak HP rpm","hpRpm","")+dyRow("Peak torque","tq"," lb-ft")+dyRow("Peak torque rpm","tqRpm","")+dyRow("Max boost","boost"," psi")+dyRow("Max EGT","egt"," &deg;C",true);
  const params=(j.params||[]).filter(p=>p.name||p.old||p.new);
  const em=k=>EMIS.map(([e,l])=>{const v=ecmEm(j,k,e);return'<tr><td><b>'+l+'</b></td><td class="'+(v.ok==="yes"?"g":v.ok==="no"?"r":"dim")+'"><b>'+(v.ok==="yes"?"Present and functioning":v.ok==="no"?"NOT present / not functioning":"Not checked")+'</b></td><td>'+esc(v.notes||"")+'</td></tr>';}).join("");
  const goals=(j.goals||[]).map(g=>(ECM_GOALS.find(x=>x[0]===g)||[g,g])[1]).join(", ");
  const trims=(j.trims||[]).map((t,x)=>t?"Cyl "+(x+1)+": "+t:"").filter(Boolean).join(" · ");
  const html='<!doctype html><html><head><meta charset="utf-8"><title>ECM job — '+esc(cust)+(j.unit?' — unit '+esc(j.unit):"")+'</title>'+SHEET_STYLE+
  '<style>.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}tr.th td{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#888;font-weight:600;}.sig{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:30px;}.sig div{border-top:1.4px solid #333;padding-top:4px;font-size:11px;color:#666;}.ok{font-size:12.5px;margin-top:8px;}.il2{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#888;margin:6px 0 2px;}</style></head><body>'+
  '<div class="head"><div class="brand"><div class="logo">RC</div><div><h1>Rollin Coal</h1><div class="sub">Canada&#39;s Diesel Engine Specialists</div></div></div><div class="meta"><strong>ECM Job Sheet</strong><br>'+esc(j.date||"")+(j.completedAt?' &rarr; '+esc(j.completedAt):"")+'<br>2040 11th Ave NW, Medicine Hat, AB &middot; 1-587-863-0505</div></div>'+
  '<div class="tt"><div><div class="en">'+esc(cust)+'</div><div class="esn">'+esc([j.unit&&("Unit "+j.unit),j.vin&&("VIN "+j.vin),[j.year,j.make,j.model].filter(Boolean).join(" ")].filter(Boolean).join(" · "))+'</div><span class="st">'+esc(ecmStLabel(j.status))+'</span></div></div>'+
  '<div class="ig">'+idcell("Engine",j.family?ecmFamLabel(j.family):"")+idcell("ESN",j.esn)+idcell("CPL / arrangement",[j.cpl,j.arrangement].filter(Boolean).join(" / "))+idcell("Rating",[j.hp&&j.hp+" HP",j.tq&&j.tq+" lb-ft"].filter(Boolean).join(" · "))+idcell("ECM part / serial",[j.ecmPn,j.ecmSn].filter(Boolean).join(" / "))+idcell("Transmission",[j.trans,j.transModel].filter(Boolean).join(" "))+idcell("Axle / tires",[j.axle,j.tire].filter(Boolean).join(" · "))+idcell("GVW / load",j.gvw)+idcell("Application",j.application)+idcell("Terrain",j.terrain)+idcell("Odometer",j.odo?j.odo+" km":"")+idcell("Engine hours",j.engHours)+'</div>'+
  (war&&war.on?'<div class="uw">This engine is under a Rollin Coal warranty until '+esc(war.w.expiryDate)+'.</div>':"")+
  ((goals||j.goalNotes)?'<div class="notes"><strong>Customer goals:</strong> '+esc(goals)+(j.goalNotes?' &middot; '+esc(j.goalNotes):"")+'</div>':"")+
  '<h2>Baseline</h2>'+faults(j.bFaults)+
  '<div class="two"><div><div class="il2">ECM trip data</div><table>'+(row("Fuel economy",tr.fuel&&tr.fuel+" L/100 km")+row("Idle",tr.idle&&tr.idle+"%")+row("Average speed",tr.avgSpd&&tr.avgSpd+" km/h")+row("Time in top gear",tr.topGear&&tr.topGear+"%")+row("Total fuel used",tr.fuelUsed&&tr.fuelUsed+" L")+row("DEF used",tr.def&&tr.def+" L")||'<tr><td class="dim">Not recorded.</td></tr>')+'</table></div>'+
  '<div><div class="il2">DPF</div><table>'+(row("Regen count",dp.regens)+row("Km between regens",dp.regenEvery)+row("Last regen",dp.lastRegen)+row("Soot load",dp.soot&&dp.soot+"%")||'<tr><td class="dim">Not recorded.</td></tr>')+'</table>'+(trims?'<div class="il2">Injector trim codes</div><div style="font-size:12px">'+esc(trims)+'</div>':"")+'</div></div>'+
  '<h2>Work performed</h2><div class="notes"><strong>Job type:</strong> '+esc((j.types||[]).map(ecmTypeLabel).join(", ")||"—")+(j.tool?' &middot; <strong>Tool:</strong> '+esc(j.tool):"")+(j.tech?' &middot; <strong>Tech:</strong> '+esc(j.tech):"")+'</div>'+
  (params.length?'<table><tr class="th"><td>Parameter</td><td>Old value</td><td>New value</td><td>Reason</td></tr>'+params.map(p=>'<tr><td><b>'+esc(p.name)+'</b></td><td>'+esc(p.old)+'</td><td><b>'+esc(p.new)+'</b></td><td>'+esc(p.why)+'</td></tr>').join("")+'</table>':'<div class="dim">No parameters changed.</div>')+
  ((j.calNew||j.calCur||j.calOld)?'<table>'+row("Calibration before",j.calOld!=null&&j.calOld!==""?j.calOld:j.calCur)+row("Calibration after",j.calNew)+'</table>':"")+
  ((j.types||[]).includes("tune")?'<table>'+row("Third-party tune vendor",(j.tune||{}).vendor)+row("Tune / file ID",(j.tune||{}).file)+row("Version",(j.tune||{}).ver)+row("Vendor job #",(j.tune||{}).job)+'</table>':"")+
  '<h2>Before and after</h2>'+(dyno?'<table><tr class="th"><td>Dyno</td><td class="num">Before</td><td class="num">After</td><td class="num">Change</td></tr>'+dyno+'</table>':'<div class="dim">No dyno runs recorded.</div>')+
  '<div class="il2" style="margin-top:10px">Faults after</div>'+faults(j.aFaults)+(j.roadTest?'<div class="notes"><strong>Road test:</strong> '+esc(j.roadTest)+'</div>':"")+
  '<h2>Emissions check</h2><div class="two"><div><div class="il2">At intake</div><table>'+em("emisIn")+'</table></div><div><div class="il2">At release</div><table>'+em("emisOut")+'</table></div></div>'+
  '<h2>Customer sign-off</h2><div class="ok">'+(truthy(j.signOk)?"&#9745;":"&#9744;")+' Customer was shown the changes made and understands the warranty terms.</div>'+
  '<div class="sig"><div>Customer signature'+(j.signName?' &middot; '+esc(j.signName):"")+'</div><div>Date'+(j.signDate?' &middot; '+esc(j.signDate):"")+'</div></div>'+
  '<div class="foot"><span>Rollin Coal &mdash; ECM job sheet. Parameter programming, calibration and emissions-intact work only.</span><span>rollin-coal.ca</span></div>'+
  '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},300);};</scr'+'ipt></body></html>';
  const w=window.open("","_blank","width=920,height=1080");if(!w)return;
  w.document.open();w.document.write(html);w.document.close();
}
// Print a branded one-page build sheet for a single engine (new window → print)
function printEngine(s,i){
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const cb=costBasis(i),tm=trueMargin(i),mp=marginPct(i),ps=partsSpend(i);
  const jl=(s.jobs||[]).filter(j=>j.engineId===i.id&&jobKind(j)==="reman").map(j=>{const te=(s.timeEntries||[]).filter(t=>t.jobId===j.id);return{j,h:te.reduce((a,t)=>a+(+t.hours||0),0),v:te.reduce((a,t)=>a+(+t.hours||0)*(+t.rate||0),0)};}).filter(x=>x.h>0||x.v>0);
  const photo=i.photo?(i.photo.startsWith("/")?window.location.origin+i.photo:i.photo):"";
  const row=(l,v,cls)=>'<tr class="'+(cls||"")+'"><td>'+l+'</td><td class="num">'+v+'</td></tr>';
  let cr="";
  const flatOnly=(+i.costCore||0)+(+i.costFreight||0)+(+i.costParts||0)+(+i.costLabor||0)===0;
  if(flatOnly&&+i.cost>0&&(ps>0||+i.dxParts>0||+i.laborLogged>0))cr+=row("Flat cost (acquisition)",$$(+i.cost));
  if(+i.costCore>0)cr+=row("Core purchase",$$(+i.costCore));
  if(+i.costFreight>0)cr+=row("Inbound freight",$$(+i.costFreight));
  if(+i.costParts>0)cr+=row("Parts kit (flat)",$$(+i.costParts));
  (i.partsLog||[]).forEach(p=>{cr+=row('<span class="ind">'+esc(p.d)+'</span> <span class="dt">'+esc(p.date||"")+'</span>',$$(+p.v||0),"part");});
  if(ps>0)cr+=row("Parts subtotal ("+(i.partsLog||[]).length+" items)",$$(ps),"sub");
  if(+i.dxParts>0)cr+=row("Diagnosis parts",$$(+i.dxParts));
  if(+i.costLabor>0)cr+=row("Machine + assembly (flat)",$$(+i.costLabor));
  jl.forEach(x=>{cr+=row('<span class="ind">Labor — '+esc(x.j.service||"job")+' ('+x.h+'h)</span>',$$(x.v),"part");});
  if(+i.laborLogged>0&&!jl.length)cr+=row("Labor (logged)",$$(+i.laborLogged));
  if(!cr&&+i.cost>0)cr=row("Flat cost",$$(+i.cost));
  if(!cr)cr='<tr><td colspan="2" class="dim">No costs recorded yet.</td></tr>';
  const idcell=(l,v)=>'<div><div class="il">'+l+'</div><div class="iv">'+esc(v||"—")+'</div></div>';
  const chans=(i.listedOn||[]).map(k=>chan(k).l).join(", ");
  const uw=uwLevel(i);
  const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(i.sku||"")+' — '+esc(i.name||"Engine")+'</title>'+
  SHEET_STYLE+'</head><body>'+
  '<div class="head"><div class="brand"><div class="logo">RC</div><div><h1>Rollin Coal</h1><div class="sub">Canada&#39;s Diesel Engine Specialists</div></div></div><div class="meta"><strong>Engine Build Sheet</strong><br>'+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+'<br>2040 11th Ave NW, Medicine Hat, AB &middot; 1-587-863-0505</div></div>'+
  '<div class="tt"><div><div class="en">'+esc(i.name||"Engine")+'</div><div class="esn">'+esc(i.sku||"")+(i.serial||i.esn?' &middot; ESN '+esc(i.serial||i.esn):"")+(i.cpl?' &middot; CPL '+esc(i.cpl):"")+'</div><span class="st">'+esc(engStatusLabel(engStatus(i)))+'</span></div>'+(photo?'<img class="ph" src="'+esc(photo)+'">':"")+'</div>'+
  '<div class="ig">'+idcell("Year",i.year)+idcell("Rated HP",i.ratedHp)+idcell("Oil Capacity",i.oilCap)+idcell("Arrangement",i.arrangement)+idcell("Condition",i.condition)+idcell("Source core",i.sourceCore)+idcell("Advertised on",chans||"—")+idcell("Qty","1 unit")+'</div>'+
  '<h2>Cost Basis</h2><table>'+cr+row("TOTAL IN THIS ENGINE",$$(cb),"tot")+'</table>'+
  '<div class="pr"><div class="pc"><div class="il">List Price</div><div class="v o">'+(i.price>0?$$(+i.price):"—")+'</div></div><div class="pc"><div class="il">Margin</div><div class="v '+(tm>0?"g":"r")+'">'+(i.price>0?$$(tm):"—")+'</div></div><div class="pc"><div class="il">Margin %</div><div class="v '+(tm>0?"g":"r")+'">'+(i.price>0?mp.toFixed(0)+"%":"—")+'</div></div></div>'+
  (uw?'<div class="uw">&#9888; '+(uw==="crit"?"UNDERWATER":"MARGIN RISK")+' — cost is '+Math.round(uwRatio(i)*100)+'% of the expected sale price.</div>':"")+
  (i.notes?'<div class="notes"><strong>Notes:</strong> '+esc(i.notes)+'</div>':"")+
  '<div class="foot"><span>Rollin Coal &mdash; Confidential unit costing</span><span>'+esc(i.sku||"")+' &middot; rollin-coal.ca</span></div>'+
  '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},300);};</scr'+'ipt></body></html>';
  const w=window.open("","_blank","width=920,height=1080");if(!w)return;
  w.document.open();w.document.write(html);w.document.close();
}
// Two-tone air horn for the SOLD moment (WebAudio, no asset; ~0.9s)
function horn(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();const g=c.createGain();g.gain.setValueAtTime(.15,c.currentTime);g.connect(c.destination);[233.1,311.1].forEach(fr=>{const o=c.createOscillator();o.type="sawtooth";o.frequency.value=fr;o.connect(g);o.start();o.stop(c.currentTime+.9);});g.gain.setValueAtTime(.15,c.currentTime+.55);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.9);setTimeout(()=>{try{c.close();}catch(e){}},1400);}catch(e){}}
// Image compression + upload now lives in lib/photos.js → uploadPhoto (Storage-backed).

// Storage
// Save only the given (changed) lists, handing the adapter the previous
// snapshot so table-backed lists can diff per-row instead of rewriting.
// Returns {failed: lists that didn't reach the server (retry them), refused: {list: [rows the database turned down]}}.
// Each list goes up as what changed since `prev` (lib/merge.js); a list in `fresh` was never stored, so it goes up whole too.
async function saveAll(s,keys,prev,role,fresh){const failed=[],refused={};const ok=keysFor(role);for(const k of (keys||ok)){if(!ok.includes(k))continue;try{const r=await db.setItem("rc:"+k,JSON.stringify(s[k]||[]),prev&&prev[k]!=null?JSON.stringify(prev[k]||[]):undefined,{fresh:!!(fresh&&fresh.has(k))});if(r&&r.refused&&r.refused.length)refused[k]=r.refused;}catch(e){failed.push(k);console.error("[rc save] "+k+" failed:",e&&e.message?e.message:e);}}return{failed,refused};}
// Why the database put a change back, in plain words.
function refusedMsg(refused,pp){
  if((refused.payPeriods||[]).some(x=>x.code==="23505"))return "That pay period was already approved, so nothing changed.";
  const ts=(refused.timesheets||[]).map(x=>String(x.id).split("|")).filter(p=>p.length===2);
  if(ts.length){const today=Tsh.shopToday(),floor=Tsh.editFloor(today);const why=ts.some(([e,dt])=>Tsh.lockedBy(pp,e,dt))?"that pay period is approved":ts.some(([,dt])=>dt<floor)?"it's too far back":"it isn't open for changes";
    return "Couldn't save "+ts.map(([,dt])=>Tsh.shortDate(dt)).join(", ")+": "+why+". It's back to what was saved. Ask the owner if something's wrong.";}
  return "Some changes weren't allowed, so they were put back to what's saved.";
}
async function loadAll(role){const d={};let m=null;const keys=keysFor(role);try{m=await db.getAll(keys.map(k=>"rc:"+k));}catch(e){console.error("[rc load] batch failed:",e&&e.message?e.message:e);}if(!m){STORE_KEYS.forEach(k=>{d[k]=EMPTY[k]||[];});d.__loadError=true;return d;}let err=false;const fresh=[];for(const k of STORE_KEYS){if(!keys.includes(k)){d[k]=[];continue;}const r=m["rc:"+k];if(r==null)fresh.push(k);try{d[k]=(r!=null)?JSON.parse(r):(EMPTY[k]||[]);}catch(e){err=true;d[k]=EMPTY[k]||[];console.error("[rc load] "+k+" parse failed:",e&&e.message?e.message:e);}}if(err)d.__loadError=true;else if(role!=="employee")fresh.push(...await seedResearch(d));d.__fresh=[...new Set(fresh)];return d;}
async function clearAll(){for(const k of STORE_KEYS){try{await db.removeItem("rc:"+k);}catch(e){}}}

// Claude AI

// Badge
// Tint a theme colour (token or hex) toward transparent — replaces the old hex+"1a" alpha suffixes.
const tint=(c,p)=>"color-mix(in srgb,"+c+" "+p+"%,transparent)";
const BC={ok:"var(--g)","in-stock":"var(--g)",paid:"var(--g)",complete:"var(--g)",active:"var(--g)",confirmed:"var(--g)",converted:"var(--g)",approved:"var(--g)",invoiced:"var(--g)",received:"var(--g)",accepted:"var(--g)",credited:"var(--g)",delivered:"var(--g)",low:"var(--w)",pending:"var(--w)",queued:"var(--mt)","on-leave":"var(--w)",contacted:"var(--b)",quoted:"var(--b)",negotiating:"var(--p)","in-progress":"var(--b)",scheduled:"var(--b)",sent:"var(--b)",shipped:"var(--b)",inspected:"var(--b)",ordered:"var(--b)",out:"var(--r)",overdue:"var(--r)",high:"var(--r)",lost:"var(--r)",declined:"var(--r)",rejected:"var(--r)",expired:"var(--r)",claimed:"var(--w)",medium:"var(--w)",new:"var(--ac)",draft:"var(--mt)","in-transit":"var(--b)",available:"var(--g)","in-reman":"var(--p)","on-hold":"var(--w)",sold:"var(--r)",open:"var(--ac)",monitoring:"var(--w)",resolved:"var(--g)",seed:"var(--mt)",shop:"var(--ac)",intake:"var(--mt)",baseline:"var(--p)",verify:"var(--ac)"};
function Badge({s}){const c=BC[s]||"var(--mt)";return (<span className="rc-badge" style={{color:c,border:"1px solid "+tint(c,40),background:tint(c,12)}}><span className="rc-bdot" style={{background:c}}/>{(s||"").replace(/-/g," ")}</span>);}

// Shared UI
function Stat({label,value,sub,dir}){return (<div className="rc-stat"><div className="rc-sl">{label}</div><div className="rc-sv">{value}</div>{sub&&<div className={"rc-ss "+(dir||"")}>{sub}</div>}</div>);}
function SH({title,children}){return (<div className="rc-sh"><span className="rc-sht">{title}</span><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{children}</div></div>);}
function Fil({opts,active,set}){return (<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{opts.map(([v,l])=>(<button key={v} onClick={()=>set(v)} className={"rc-fb"+(active===v?" on":"")}>{l}</button>))}</div>);}
function Empty({icon,title,sub,action,label}){return (<div style={{textAlign:"center",padding:"50px 20px",color:"var(--mt)"}}><div style={{fontSize:36,marginBottom:10}}>{icon}</div><div style={{fontFamily:"var(--fd)",fontSize:17.5,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6,color:"var(--tx2)"}}>{title}</div><div style={{fontSize:14,marginBottom:16}}>{sub}</div>{action&&<button className="rc-ba" onClick={action}>{label}</button>}</div>);}
// A header is text, or {h, cls} to class that column (rc-sm-hide drops it on a phone; give its cells the same class).
// `fit`: on a phone the table may shrink to the screen instead of scrolling sideways (for tables whose phone columns fit).
function Tbl({headers,children,fit}){return (<div className="rc-card"><table className={"rc-tbl"+(fit?" rc-fit":"")}><thead><tr>{headers.map((h,i)=>(<th key={i} className={h&&h.cls||undefined}>{h&&h.h!=null?h.h:h}</th>))}</tr></thead><tbody>{children}</tbody></table></div>);}
// A record's name for a button's label or a toast.
const recName=x=>x?String(x.name||x.sku||x.invNum||x.quoteNum||x.title||x.service||x.engineName||x.carrier||x.vendor||x.platform||x.cat||x.desc||x.business||""):"";
function BtnRow({children,nw}){return (<div style={{display:"flex",gap:4,flexWrap:nw?"nowrap":"wrap"}}>{children}</div>);}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════
function Overview({s,d,owner=true}){
  const[briefBusy,setBriefBusy]=useState(false);const[showBrief,setShowBrief]=useState(false);const[justSent,setJustSent]=useState(null);
  const sendBrief=async()=>{if(briefBusy)return;setBriefBusy(true);const r=await requestBriefNow();setBriefBusy(false);if(!r||r.error){d({type:"TOAST",d:{msg:"⚠ Brief failed: "+(r&&r.error||"unknown"),t:Date.now()}});return;}setJustSent(r);setShowBrief(true);d({type:"TOAST",d:{msg:r.sent?"✉ Brief emailed to "+(r.to||"you"):"☀️ Brief generated — email not configured yet",t:Date.now()}});};
  const aj=s.jobs.filter(j=>j.status!=="complete").length;const ec=s.inventory.filter(i=>isEngine(i)&&engStatus(i)==="available").length;
  const aq=(s.quotes||[]).filter(q=>q.status==="sent"||q.status==="draft").length;
  const pi=s.invoices.filter(i=>!Mny.isPaid(i));const pa=pi.reduce((a,inv)=>a+invTot(inv),0);
  // Collected = paid invoices before tax (the GST/HST isn't the shop's money) + engines sold without an invoice.
  const rv=s.invoices.filter(Mny.isPaid).reduce((a,inv)=>a+Mny.docSub(inv),0);
  const _se=s.inventory.filter(i=>isEngine(i)&&engStatus(i)==="sold");const _ie=new Set((s.invoices||[]).map(inv=>inv.engineId).filter(Boolean).map(String));const engRev=_se.filter(e=>!_ie.has(String(e.id))).reduce((a,e)=>a+(+e.price||0),0);
  const nl=s.leads.filter(l=>l.status==="new"||l.status==="contacted").length;
  const pendCores=(s.cores||[]).filter(c=>c.status==="pending").length;
  const activeShip=(s.shipments||[]).filter(sh=>!sh.deliveryConfirmed).length;
  const overdueInv=s.invoices.filter(i=>Mny.isOverdue(i)).length;
  const openPOs=(s.purchaseOrders||[]).filter(p=>p.status!=="received").length;
  const activeWarranties=(s.warranties||[]).filter(w=>w.status==="active").length;
  // Monthly goal thermometer (fed by the wins feed)
  const goal=+getSet(s).monthlyGoal||50000;
  // Months are Medicine Hat months (the Morning Brief counts the same way), not UTC ones.
  const cmKey=Tsh.shopToday().slice(0,7);const wMonth=w=>Mny.winDate(w).slice(0,7);
  const mWins=(s.wins||[]).filter(w=>w.kind==="sale"&&wMonth(w)===cmKey);
  const mRev=mWins.reduce((a,w)=>a+(+w.price||0),0);
  const prevBest=Object.values((s.wins||[]).filter(w=>w.kind==="sale"&&wMonth(w)!==cmKey).reduce((m,w)=>{const k=wMonth(w);m[k]=(m[k]||0)+(+w.price||0);return m;},{})).reduce((a,v)=>Math.max(a,v),0);
  const isRecord=prevBest>0&&mRev>prevBest;
  const pct=Math.max(0,Math.min(100,goal>0?mRev/goal*100:0));
  const monthName=Tsh.monthLabel(cmKey).split(" ")[0].toUpperCase();
  // Shop Day digest (auto-captured activity + gaps)
  const tIso=isoToday();
  const todays=(s.activity||[]).filter(x=>(x.ts||"").slice(0,10)===tIso).slice(0,8);
  const hrsToday=(s.timeEntries||[]).filter(t=>t.date===tIso).reduce((a,t)=>a+(+t.hours||0),0);
  const engsO=s.inventory.filter(isEngine);
  const unlistedO=engsO.filter(i=>engStatus(i)==="available"&&!(i.listedOn||[]).length).length;
  const noCostO=engsO.filter(i=>costBasis(i)<=0).length;
  const staleO=engsO.filter(i=>["core","in-reman","on-hold"].includes(engStatus(i))&&i.stageDate&&(Date.now()-new Date(i.stageDate).getTime())>7*864e5);
  const uwO=engsO.filter(i=>uwLevel(i));
  // Daily 3 shift card: dealt once per day, tasks self-complete as data is fixed
  const d3set=getSet(s);
  const d3=(d3set.d3&&d3set.d3.date===tIso)?(d3set.d3.tasks||[]):null;
  useEffect(()=>{const cur=(s.settings||[])[0];if(cur&&cur.d3&&cur.d3.date===tIso)return;const tasks=genDaily3(s);const patch={d3:{date:tIso,tasks}};if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:patch});else d({type:"ADD",list:"settings",d:patch,label:"Shift card dealt"});},[tIso,s.settings]);
  const d3done=d3?d3.map(t=>d3Done(s,t)):[];
  const allDone=!!d3&&d3.length>0&&d3done.every(Boolean);
  useEffect(()=>{if(!allDone)return;const cur=(s.settings||[])[0];if(!cur||cur.d3LastDone===tIso)return;const y=new Date(Date.now()-864e5).toISOString().slice(0,10);const streak=cur.d3LastDone===y?(+cur.d3Streak||0)+1:1;d({type:"UPDATE",list:"settings",id:cur.id,d:{d3LastDone:tIso,d3Streak:streak}});d({type:"TOAST",d:{msg:"✅ Shift card complete — 🔥 streak "+streak,t:Date.now()}});},[allDone]);
  const d3streak=+d3set.d3Streak||0;
  const d3open=t=>{if(t.t==="inv"){d({type:"TAB",v:"invoices"});return;}if(t.t==="follow"){d({type:"MODAL",v:"pros-rec",d:{list:t.list,id:t.id}});return;}const i=(s.inventory||[]).find(x=>x.id===t.id);if(i)d({type:"MODAL",v:"part-detail",d:i});};
  // Break-even (the owner's view only, since it includes payroll): this month's fixed costs against what the
  // month earned after the engines' cost. The mark on the bar is the sales that cover them at the usual margin.
  const be=owner?Mny.breakEven(s,cmKey):null;const fixedMo=be?be.fixed:0;const beEng=be&&be.engines;
  const bePct=be&&fixedMo>0&&be.salesNeeded&&goal>0?Math.min(100,be.salesNeeded/goal*100):null;
  return (<div>
    <div className="rc-card rc-goal">
      <div className="rc-goal-top"><span className="rc-sl" style={{margin:0,fontSize:12,letterSpacing:2}}>{monthName} GOAL</span>{isRecord&&<span className="rc-goal-best">🏆 BEST MONTH EVER</span>}<span style={{flex:1}}/><span className="rc-goal-v">{$K(mRev)} <em>/ {$K(goal)}</em></span><button className="rc-bs" style={{fontSize:12}} onClick={()=>d({type:"MODAL",v:"set-goal"})}>✎ Goal</button></div>
      <div className="rc-goal-bar"><div className="rc-goal-fill" style={{width:pct+"%",background:pct>=100?"linear-gradient(90deg,var(--g),var(--g))":"var(--grad)"}}/>{bePct!=null&&bePct<100&&<div className="rc-goal-mark" style={{left:bePct+"%"}} title={"sales to break even about "+$K(be.salesNeeded)}/>}</div>
      <div className="rc-goal-sub">{mWins.length} engine{mWins.length===1?"":"s"} sold this month · {pct.toFixed(0)}% of goal{owner&&(fixedMo>0?(<span> · fixed costs {$K(fixedMo)} a month{beEng?` ≈ ${beEng} engine${beEng>1?"s":""}`:""}{be.cleared?" · ✓ break-even cleared":" · "+$K(Math.max(0,fixedMo-be.earned))+" more margin to break even"}</span>):(<span style={{color:"var(--ft)"}}> · add monthly expenses to see your break-even line</span>))}</div>
    </div>
    {(()=>{const b=justSent&&justSent.text?{date:isoToday(),text:justSent.text,sent:justSent.sent,to:justSent.to,reason:justSent.reason}:(s.brief&&s.brief.date?s.brief:null);return(<div className="rc-card" style={{padding:"12px 16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span className="rc-sl" style={{margin:0,fontSize:12,letterSpacing:2}}>☀️ MORNING BRIEF</span>{b?(<span style={{fontSize:12,color:b.sent?"var(--g)":"var(--w)"}}>{b.date} · {b.sent?"emailed to "+(b.to||"you"):"generated, not emailed"+(b.reason?" — "+b.reason:"")}</span>):(<span style={{fontSize:12,color:"var(--mt)"}}>lands in your inbox at 7am · runs by itself</span>)}<span style={{flex:1}}/>{b&&<button className="rc-fb" onClick={()=>setShowBrief(v=>!v)}>{showBrief?"Hide":"Read"}</button>}{usingCloud&&<button className="rc-bs" disabled={briefBusy} onClick={sendBrief}>{briefBusy?"⏳ Working…":"✉ Send now"}</button>}</div>
      {b&&showBrief&&<pre style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.65,color:"var(--tx)",marginTop:10,fontFamily:"var(--fb)",background:"var(--in)",border:"1px solid var(--ln)",borderRadius:9,padding:"10px 12px",maxHeight:360,overflowY:"auto"}}>{!owner&&b.staffText!=null?b.staffText:b.text}</pre>}
    </div>);})()}
    <div className="rc-card" style={{padding:"12px 16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}><span className="rc-sl" style={{margin:0,fontSize:12,letterSpacing:2}}>TODAY'S 3 — SHIFT CARD</span>{d3streak>0&&<span style={{fontSize:12,color:"var(--w)",fontWeight:700}}>🔥 {d3streak}-day streak</span>}<span style={{flex:1}}/>{allDone&&<span className="rc-lm-full" style={{fontSize:13}}>✅ SHIFT COMPLETE</span>}</div>
      {!d3||d3.length===0?(<div style={{fontSize:13,color:"var(--g)"}}>🏁 Lot's clean — nothing urgent today. Go sell something.</div>):d3.map((t,x)=>(<div key={x} onClick={()=>!d3done[x]&&d3open(t)} style={{display:"flex",gap:9,alignItems:"center",padding:"6px 0",borderBottom:x<d3.length-1?"1px solid var(--ln2)":"none",fontSize:14,cursor:d3done[x]?"default":"pointer",opacity:d3done[x]?.55:1}}><span style={{width:16,textAlign:"center",color:d3done[x]?"var(--g)":"var(--mt)",fontWeight:700}}>{d3done[x]?"✓":x+1}</span><span style={{flex:1,textDecoration:d3done[x]?"line-through":"none"}}>{t.l}</span>{!d3done[x]&&<span style={{fontSize:11,color:"var(--mt)"}}>tap to open →</span>}</div>))}
    </div>
    <div className="rc-g6">
      <Stat label="Active Jobs" value={aj}/><Stat label="Engines Available" value={ec}/><Stat label="Open Quotes" value={aq}/>
      <Stat label="Pending Revenue" value={$K(pa)} sub={`${pi.length} invoices`}/><Stat label="Revenue Collected" value={$K(rv+engRev)} sub={engRev>0?"incl "+$K(engRev)+" engines":undefined}/><Stat label="New Leads" value={nl}/>
    </div>
    <div className="rc-g6">
      <Stat label="Pending Cores" value={pendCores} sub={pendCores>0?"needs follow-up":"all clear"} dir={pendCores>0?"dn":"up"}/><Stat label="Active Shipments" value={activeShip}/>
      <Stat label="Overdue Invoices" value={overdueInv} sub={overdueInv>0?"action needed":""} dir={overdueInv>0?"dn":"up"}/><Stat label="Open POs" value={openPOs}/>
      <Stat label="Active Warranties" value={activeWarranties}/><Stat label="Customers" value={(s.customers||[]).length}/>
    </div>
    <div className="rc-2col">
      <div><SH title="Recent Jobs"/>{s.jobs.length===0?(<Empty icon="🔧" title="No Jobs" sub="Add work orders" action={()=>d({type:"MODAL",v:"add-job"})} label="+ New Job"/>):(<Tbl headers={["Customer","Service","Due","Status"]}>{s.jobs.filter(j=>j.status!=="complete").slice(0,5).map(j=>(<tr key={j.id} style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})}><td className="rc-tn">{jobCust(s,j)}</td><td style={{color:"var(--tx2)",fontSize:13}}>{j.service}</td><td style={{color:"var(--mt)",fontSize:13}}>{j.due}</td><td><Badge s={j.status}/></td></tr>))}</Tbl>)}</div>
      <div><SH title="Alerts"/><div className="rc-card" style={{padding:"12px 16px"}}>
        {overdueInv>0&&<div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--ln)",alignItems:"center"}}><span style={{color:"var(--r)",fontSize:17.5}}>⚠</span><span style={{fontSize:14,color:"var(--r)"}}>{overdueInv} overdue invoice{overdueInv>1?"s":""}</span></div>}
        {pendCores>0&&<div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--ln)",alignItems:"center"}}><span style={{color:"var(--w)",fontSize:17.5}}>🔄</span><span style={{fontSize:14,color:"var(--w)"}}>{pendCores} core return{pendCores>1?"s":""} pending</span></div>}
        {activeShip>0&&<div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--ln)",alignItems:"center"}}><span style={{color:"var(--b)",fontSize:17.5}}>🚚</span><span style={{fontSize:14,color:"var(--b)"}}>{activeShip} shipment{activeShip>1?"s":""} in transit</span></div>}
        {(s.warranties||[]).filter(w=>w.status==="active"&&w.expiryDate&&w.expiryDate<isoToday()).length>0&&<div style={{display:"flex",gap:10,padding:"8px 0",alignItems:"center"}}><span style={{color:"var(--r)",fontSize:17.5}}>📋</span><span style={{fontSize:14,color:"var(--r)"}}>Warranties expiring soon</span></div>}
        {overdueInv===0&&pendCores===0&&activeShip===0&&<div style={{fontSize:14,color:"var(--g)",padding:"12px 0"}}>✓ All clear — no urgent items</div>}
      </div></div>
    </div>
    <div className="rc-2col">
      <div><SH title="Today at the Shop"><span className="rc-bc">{hrsToday}h logged</span><button className="rc-fb" onClick={()=>d({type:"MODAL",v:"shop-log"})}>📜 Full Log</button></SH><div className="rc-card" style={{padding:"10px 14px"}}>
        {todays.length===0?(<div style={{fontSize:13,color:"var(--mt)",padding:"8px 0"}}>Nothing logged yet today — this fills in as the crew works.</div>):todays.map(x=>(<div key={x.id} className="rc-act"><span className="rc-act-t">{(x.ts||"").slice(11,16)}</span><span className="rc-act-u">{x.user}</span><span style={{flex:1,minWidth:0}}>{x.msg}</span></div>))}
        {(uwO.length>0||staleO.length>0||unlistedO>0||noCostO>0)&&(<div style={{borderTop:"1px solid var(--ln)",marginTop:8,paddingTop:8}}>
          <div className="rc-ml" style={{marginBottom:4}}>Gaps</div>
          {uwO.slice(0,3).map(i=>(<div key={"uw"+i.id} className="rc-gap" style={{color:uwLevel(i)==="crit"?"var(--r)":"var(--w)"}}>⚠ {i.name} — cost at {Math.round(uwRatio(i)*100)}% of expected sale</div>))}
          {staleO.slice(0,3).map(i=>(<div key={i.id} className="rc-gap">⏳ {i.name} — {Math.floor((Date.now()-new Date(i.stageDate).getTime())/864e5)}d in {engStatusLabel(engStatus(i))}</div>))}
          {unlistedO>0&&<div className="rc-gap">📣 {unlistedO} available engine{unlistedO>1?"s":""} not advertised</div>}
          {noCostO>0&&<div className="rc-gap">💲 {noCostO} engine{noCostO>1?"s":""} missing cost basis</div>}
        </div>)}
      </div></div>
      <div><SH title="Wins"/><div className="rc-card" style={{padding:"10px 14px"}}>
        {(s.wins||[]).length===0?(<div style={{fontSize:13,color:"var(--mt)",padding:"8px 0"}}>Your first SOLD lands here. 🏆</div>):(s.wins||[]).slice(0,6).map(w=>(<div key={w.id} className="rc-win"><span className="rc-win-i">🏆</span><span style={{flex:1,minWidth:0}}><span className="rc-tn">{w.name}</span><span className="rc-win-d"> · {(w.ts||"").slice(0,10)} · {w.user}</span></span>{w.src?(<span style={{fontSize:12,color:"var(--b)",border:"1px solid var(--b)",borderRadius:8,padding:"1px 6px",flexShrink:0}}>{srcLabel(w.src)}</span>):(<select value="" onChange={e=>e.target.value&&d({type:"UPDATE",list:"wins",id:w.id,d:{src:e.target.value}})} style={{background:"var(--in)",border:"1px solid var(--ln)",borderRadius:6,color:"var(--tx2)",fontSize:12,padding:"1px 2px",flexShrink:0,fontFamily:"var(--fb)"}}><option value="">src?</option>{SALE_SRC.map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</select>)}<span className="rc-win-p">{$$(w.price)}</span></div>))}
      </div></div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS & JOBS (same as v2 — compact)
// ═══════════════════════════════════════════════════════════════
function Customers({s,d}){
  const[search,setSearch]=useState("");const[jf,setJf]=useState("all");const[view,setView]=useState("list");
  const filt=(s.customers||[]).filter(c=>(c.name||"").toLowerCase().includes(search.toLowerCase()));
  const jFilt=(s.jobs||[]).filter(j=>jf==="all"||j.status===jf||((jf==="service"||jf==="reman")&&jobKind(j)===jf));
  if(view==="board"){const cols=[{k:"queued",l:"Queued"},{k:"in-progress",l:"In Progress"},{k:"complete",l:"Complete"}];return (<div><SH title="Job Board"><button className="rc-fb" onClick={()=>setView("list")}>← Back</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-job"})}>+ Job</button></SH><div className="rc-board">{cols.map(col=>{const cj=s.jobs.filter(j=>j.status===col.k);return (<div key={col.k} className="rc-bcol"><div className="rc-bh"><span className="rc-bt">{col.l}</span><span className="rc-bc">{cj.length}</span></div><div style={{padding:10,display:"flex",flexDirection:"column",gap:8}}>{cj.map(j=>(<div key={j.id} className={"rc-jc "+(j.priority||"")} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})}><div className="rc-jcn">{jobCust(s,j)}</div><div style={{fontSize:13,color:"var(--act)"}}>{j.service}</div>{jobKind(j)==="service"&&<div style={{fontSize:13,fontWeight:600,marginTop:2}}>{$$(jobCharge(s,j))}{jobInv(s,j)?<span style={{fontSize:11.5,color:"var(--g)",fontWeight:500,marginLeft:6}}>billed</span>:null}</div>}<div style={{fontSize:12,color:"var(--mt)",display:"flex",justifyContent:"space-between",marginTop:4}}><span>{j.tech}</span><span>{j.due}</span></div></div>))}</div></div>);})}</div></div>);}
  return (<div>
    <SH title="Customers"><button className="rc-fb" onClick={()=>setView("board")}>Job Board</button><input className="rc-si" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-cust"})}>+ Customer</button></SH>
    {filt.length===0?(<Empty icon="👤" title="No Customers" sub="Add your first customer" action={()=>d({type:"MODAL",v:"add-cust"})} label="+ Add"/>):(<div className="rc-gc">{filt.map(c=>(<div key={c.id} className="rc-cc" onClick={()=>d({type:"MODAL",v:"cust-detail",d:c})}><div style={{display:"flex",justifyContent:"space-between"}}><div><div className="rc-ccn">{c.name}</div><div style={{fontSize:13,color:"var(--act)"}}>{c.type||"Individual"} {c.province?`· ${c.province}`:""}</div></div><BtnRow><button className="rc-bs" onClick={e=>{e.stopPropagation();d({type:"MODAL",v:"edit-cust",d:c})}} style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={e=>{e.stopPropagation();d({type:"DELETE",list:"customers",id:c.id})}} style={{fontSize:14.5}}>×</button></BtnRow></div><div style={{fontSize:13,color:"var(--tx2)",marginTop:4}}>{[c.phone,c.email].filter(Boolean).join(" · ")||"No phone or email yet"}</div><div className="rc-3c" style={{margin:"10px 0"}}><div><div className="rc-ml">Paid</div><div className="rc-mv">{$K(Mny.custPaid(s,c.id))}</div></div><div><div className="rc-ml">Visits</div><div className="rc-mv">{c.visits||0}</div></div><div><div className="rc-ml">Last</div><div className="rc-mv" style={{fontSize:14.5}}>{c.last||"—"}</div></div></div>{(c.vehicles||[]).length>0&&<div style={{fontSize:13,color:"var(--tx2)"}}>{c.vehicles.join(" · ")}</div>}</div>))}</div>)}
    <SH title="Work Orders"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-job"})}>+ Work Order</button></SH>
    <Fil opts={[["all","All"],["queued","Queued"],["in-progress","Active"],["complete","Done"],["service","Services"],["reman","Reman"]]} active={jf} set={setJf}/>
    {jFilt.length===0?(<Empty icon="🔧" title="No Work Orders" sub="Open one for a customer's service or for a reman" action={()=>d({type:"MODAL",v:"add-job"})} label="+ Work Order"/>):(<Tbl fit headers={["Customer",{h:"Service",cls:"rc-sm-hide"},"Charge",{h:"Hours",cls:"rc-sm-hide"},{h:"Tech",cls:"rc-sm-hide"},"Status",{h:"",cls:"rc-sm-hide"}]}>{jFilt.map(j=>{const svc=jobKind(j)==="service";return(<tr key={j.id} style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})}><td className="rc-tn">{jobCust(s,j)}{j.vehicle?<div style={{fontSize:12.5,color:"var(--mt)",fontWeight:400}}>{j.vehicle}</div>:null}<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--tx2)",fontWeight:400}}>{[j.service,j.tech,jobHours(s,j)+"h",svc?"":"reman"].filter(Boolean).join(" · ")}</div></td><td className="rc-sm-hide" style={{fontSize:13.5}}>{j.service}{!svc&&<span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--mt)",marginLeft:7}}>REMAN</span>}</td><td style={{fontWeight:600,whiteSpace:"nowrap"}}>{svc?$$(jobCharge(s,j)):<span style={{color:"var(--mt)",fontWeight:400}}>internal</span>}{svc&&jobInv(s,j)?<div style={{fontSize:11.5,color:"var(--g)",fontWeight:500}}>billed</div>:null}</td><td className="rc-sm-hide" style={{fontSize:13.5,color:"var(--tx2)"}}>{jobHours(s,j)}h</td><td className="rc-sm-hide" style={{fontSize:13.5}}>{j.tech}</td><td><Badge s={j.status}/></td><td className="rc-sm-hide" onClick={e=>e.stopPropagation()}><BtnRow nw><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-job",d:j})} aria-label={"Edit "+recName(j)} title="Edit" style={{fontSize:14.5}}>✎</button>{j.status!=="complete"&&<button className="rc-bs" onClick={()=>d({type:"UPDATE",list:"jobs",id:j.id,d:{status:j.status==="queued"?"in-progress":"complete"}})}>→</button>}<button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"jobs",id:j.id})} aria-label={"Delete "+recName(j)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>);})}</Tbl>)}
    <SH title="Communication Log"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-comm"})}>+ Log</button></SH>
    {(s.commsLog||[]).length===0?(<Empty icon="💬" title="No Logs" sub="Track calls, emails, texts" action={()=>d({type:"MODAL",v:"add-comm"})} label="+ Add"/>):(<Tbl headers={["Date","Customer","Type","Summary","Follow-Up",""]}>{(s.commsLog||[]).slice(0,10).map(c=>(<tr key={c.id}><td style={{fontSize:13}}>{c.date}</td><td className="rc-tn">{cn(s.customers,c.custId)}</td><td><Badge s={c.type}/></td><td style={{fontSize:13,color:"var(--tx2)"}}>{c.summary}</td><td style={{fontSize:13,color:c.followUp?"var(--w)":"var(--mt)"}}>{c.followUp||"—"}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-comm",d:c})} aria-label={"Edit "+recName(c)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"commsLog",id:c.id})} aria-label={"Delete "+recName(c)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// QUOTES (same as v2)
// ═══════════════════════════════════════════════════════════════
// A quote turns into an invoice once: the quote is marked invoiced and keeps the invoice's id, so the button
// goes. Its work order (→ Job) is a flat service job for the quoted amount, billed by that same invoice, so
// Bill this job never charges the hours again on top of the quote.
function quoteToInvoice(s,d,q){if(!q||q.invoiceId)return;const nid=Date.now();const date=isoToday(),due="Net 30";
  d({type:"ADD",list:"invoices",d:{id:nid,invNum:"INV-"+String(nid).slice(-6),custId:q.custId,date,due,dueDate:Mny.dueDateOf({date,due}),taxRate:Mny.taxRateOf(q),items:q.items||[],status:"pending",quoteId:q.id},label:"Invoice created from "+(q.quoteNum||"the quote")});
  d({type:"UPDATE",list:"quotes",id:q.id,d:{status:"invoiced",invoiceId:nid}});
  if(q.jobId)d({type:"UPDATE",list:"jobs",id:q.jobId,d:{invoiceId:nid,pricing:"flat",charge:qTot(q)}});}
function quoteToJob(s,d,q){if(!q||q.jobId)return;const jid=Date.now();
  d({type:"ADD",list:"jobs",d:{id:jid,kind:"service",custId:q.custId,vehicle:"",service:q.description||q.quoteNum||"Quoted work",type:"Quoted work",pricing:"flat",charge:qTot(q),rate:0,invoiceId:q.invoiceId||null,quoteId:q.id,tech:"Unassigned",due:"",notes:"From "+(q.quoteNum||"a quote"),priority:"medium",status:"queued"},label:"Work order opened from "+(q.quoteNum||"the quote")});
  d({type:"UPDATE",list:"quotes",id:q.id,d:{jobId:jid}});}
function Quotes({s,d}){
  const[f,sf]=useState("all");const[aiLoading,setAi]=useState(false);const[aiR,setAiR]=useState(null);
  const qs=s.quotes||[];const fl=qs.filter(q=>f==="all"||q.status===f);
  const aiGen=async()=>{setAi(true);const inv=s.inventory.filter(i=>i.qty>0&&i.price>0).slice(0,15).map(i=>`${i.name}: $${i.price}`).join("\n");const r=await askClaude(`You are the quoting assistant for Rollin Coal diesel engine shop in Medicine Hat AB. Labor rate $${shopRate(s)||120}/hr.\n\nInventory:\n${inv}\n\nGenerate a realistic quote. Return ONLY valid JSON: {"description":"..","items":[{"d":"..","q":1,"r":999}],"notes":".."}`);setAi(false);try{setAiR(JSON.parse(r.replace(/\`\`\`json|\`\`\`/g,"").trim()));}catch(e){setAiR({description:"AI Draft",items:[{d:"Edit this item",q:1,r:0}],notes:r});}};
  return (<div>
    <div className="rc-g4"><Stat label="Total Quotes" value={qs.length}/><Stat label="Open" value={qs.filter(q=>q.status==="draft"||q.status==="sent").length}/><Stat label="Approved" value={qs.filter(q=>q.status==="approved").length}/><Stat label="Quoted Value" value={$K(qs.filter(q=>q.status==="sent"||q.status==="approved").reduce((a,q)=>a+qTax(q),0))}/></div>
    <SH title="Quotes"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-quote"})}>+ Quote</button><button className="rc-bs" onClick={aiGen} disabled={aiLoading} style={{color:"var(--p)",borderColor:"var(--p)"}}>{aiLoading?"⏳":"✨ AI Quote"}</button></SH>
    <Fil opts={[["all","All"],["draft","Draft"],["sent","Sent"],["approved","Approved"],["invoiced","Invoiced"],["declined","Declined"]]} active={f} set={sf}/>
    {aiR&&(<div className="rc-card" style={{padding:16,marginBottom:16,borderColor:"var(--p)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--p)",letterSpacing:2,textTransform:"uppercase",fontSize:14.5}}>✨ AI Quote Draft</span><button className="rc-bs" onClick={()=>setAiR(null)} style={{fontSize:14.5}}>✕</button></div><div style={{fontSize:14,color:"var(--tx2)",marginBottom:8}}>{aiR.description}</div><div style={{background:"var(--sf2)",borderRadius:6,padding:10,marginBottom:10}}>{(aiR.items||[]).map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<aiR.items.length-1?"1px solid var(--ln)":"none",fontSize:14}}><span style={{flex:1}}>{it.d}{it.svcId?<span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--act)",marginLeft:7}}>SERVICE</span>:null}</span><span style={{width:80,textAlign:"right",fontWeight:600}}>{$$(it.q*it.r)}</span></div>))}</div><BtnRow><button className="rc-ba" onClick={()=>{d({type:"ADD",list:"quotes",d:{quoteNum:"QT-"+Date.now().toString().slice(-6),custId:0,description:aiR.description,items:aiR.items,notes:aiR.notes||"",status:"draft",date:isoToday(),validUntil:"30 days",taxRate:0.05}});setAiR(null);}}>Save Draft</button><button className="rc-bs" onClick={aiGen} style={{color:"var(--p)",borderColor:"var(--p)"}}>🔄</button></BtnRow></div>)}
    {fl.length===0?(<Empty icon="📋" title="No Quotes" sub="Create estimates" action={()=>d({type:"MODAL",v:"add-quote"})} label="+ Quote"/>):(<Tbl fit headers={[{h:"#",cls:"rc-sm-hide"},"Customer",{h:"Description",cls:"rc-sm-hide"},"Total",{h:"Status",cls:"rc-sm-hide"},""]}>{fl.map(q=>(<tr key={q.id}><td className="rc-sm-hide" style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--act)"}}>{q.quoteNum||q.id}</td><td className="rc-tn">{cn(s.customers,q.custId)}<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--mt)",fontWeight:400}}>{q.quoteNum||q.id}{q.description?" · "+q.description:""}</div><div className="rc-sm-only" style={{marginTop:4}}><Badge s={q.status}/></div></td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)"}}>{q.description}</td><td style={{fontWeight:600}}>{$$(qTax(q))}</td><td className="rc-sm-hide"><Badge s={q.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"quote-detail",d:q})}>View</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-quote",d:q})} aria-label={"Edit "+recName(q)} title="Edit" style={{fontSize:14.5}}>✎</button>{q.status==="draft"&&<button className="rc-bs" style={{color:"var(--b)",borderColor:"var(--b)"}} onClick={()=>d({type:"UPDATE",list:"quotes",id:q.id,d:{status:"sent"}})}>Send</button>}{q.status==="sent"&&<><button className="rc-bs rc-bsg" onClick={()=>d({type:"UPDATE",list:"quotes",id:q.id,d:{status:"approved"}})}>✓</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"UPDATE",list:"quotes",id:q.id,d:{status:"declined"}})}>✗</button></>}{(q.status==="approved"||q.status==="invoiced")&&!q.jobId&&<button className="rc-bs" style={{color:"var(--g)",borderColor:"var(--g)"}} onClick={()=>quoteToJob(s,d,q)}>→Job</button>}{q.status==="approved"&&!q.invoiceId&&<button className="rc-bs" style={{color:"var(--act)",borderColor:"var(--ac)"}} onClick={()=>quoteToInvoice(s,d,q)}>→Inv</button>}<button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"quotes",id:q.id})} aria-label={"Delete "+recName(q)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY with AI Listing Generator
// ═══════════════════════════════════════════════════════════════
function Inv({s,d}){
  // The AI listing shows under the page header and scrolls into view when it arrives.
  const aiTop=useRef(false);
  const[f,sf]=useState("all");const[q,sq]=useState("");const[aiL,setAiL]=useState(null);const[aiR,setAiR]=useState(null);const[view,setView]=useState("list");const[hov,setHov]=useState(null);
  const matchF=i=>f==="all"?true:f==="engines"?isEngine(i):f==="unlisted"?(isEngine(i)&&engStatus(i)!=="sold"&&!((i.listedOn||[]).length)):ENG_STATUSES.includes(f)?(isEngine(i)&&engStatus(i)===f):f==="parts"?!isEngine(i):stk(i)===f;
  const locs=engLocs(s);
  const matchQ=i=>{const t=(q||"").toLowerCase();return !t||[i.name,i.sku,(i.oldSkus||[]).join(" "),i.serial,i.esn,i.cpl,areaTitle(locs.get(i.id))].some(v=>(v||"").toLowerCase().includes(t));};
  const fl=s.inventory.filter(matchF).filter(matchQ);
  useEffect(()=>{if(aiTop.current&&aiR){aiTop.current=false;requestAnimationFrame(()=>{const el=document.querySelector(".rc-ai-res");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});});}},[aiR]);
  const engs=s.inventory.filter(isEngine);
  const avail=engs.filter(i=>engStatus(i)==="available").length;
  const listed=engs.filter(i=>engStatus(i)!=="sold"&&(i.listedOn||[]).length>0).length;
  const tv=engs.filter(i=>engStatus(i)!=="sold").reduce((a,i)=>a+(i.price||0),0);
  const tcb=engs.filter(i=>engStatus(i)!=="sold").reduce((a,i)=>a+costBasis(i),0);
  const genListing=async(item)=>{setAiL(item.id);const r=await askClaude(`Write a Facebook Marketplace listing for Rollin Coal (Medicine Hat AB, diesel engine specialists). Engine: ${item.name}, SKU: ${item.sku}, Condition: ${item.condition}, Price: $${item.price} CAD, Serial: ${item.serial||item.esn||"N/A"}. Include headline, 3-4 bullet specs, "Ships Canada-wide", Contact: 587-863-0505. Hashtags. Under 200 words. Plain text only, no markdown.`);setAiL(null);aiTop.current=true;setAiR({item,text:r});};
  if(view==="board"){const moveTo=(id,st)=>d({type:"UPDATE",list:"inventory",id,d:{status:st}});const wip=engs.filter(i=>["core","in-reman","on-hold"].includes(engStatus(i)));const wipCost=wip.reduce((a,i)=>a+costBasis(i),0);return (<div>
    <SH title="Reman Board"><button className="rc-fb" onClick={()=>setView("list")}>← List</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-part",d:{cat:"Complete Engine",status:"available"}})}>+ Engine</button></SH>
    <div className="rc-g4"><Stat label="In Pipeline" value={wip.length} sub="core · reman · hold"/><Stat label="WIP Capital" value={$K(wipCost)} sub="cost tied up"/><Stat label="Available" value={avail}/><Stat label="Sold" value={engs.filter(i=>engStatus(i)==="sold").length}/></div>
    <div style={{fontSize:12,color:"var(--mt)",marginBottom:10,fontStyle:"italic"}}>Drag an engine card between stages, or use the ← → arrows. Click a card to open its passport.</div>
    <div className="rc-rboard">{ENG_STATUSES.map(st=>{const items=engs.filter(i=>engStatus(i)===st);const stCost=items.reduce((a,i)=>a+costBasis(i),0);const c=BC[st]||"var(--tx2)";return (<div key={st} className="rc-bcol" onDragOver={e=>{e.preventDefault();if(hov!==st)setHov(st);}} onDragLeave={()=>setHov(h=>h===st?null:h)} onDrop={e=>{e.preventDefault();const id=+e.dataTransfer.getData("text/plain");if(id)moveTo(id,st);setHov(null);}} style={hov===st?{borderColor:c,boxShadow:`inset 0 0 0 1px ${c}`}:{}}><div className="rc-bh"><span className="rc-bt" style={{color:c}}>{engStatusLabel(st)}</span><span className="rc-bc">{items.length}</span></div><div style={{padding:8,display:"flex",flexDirection:"column",gap:6,minHeight:60}}>{items.length===0?<div style={{fontSize:12,color:"var(--ft)",textAlign:"center",padding:"16px 0"}}>—</div>:items.map(i=>{const idx=ENG_STATUSES.indexOf(st);return (<div key={i.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(i.id))} className="rc-jc" style={{borderLeftColor:c,cursor:"grab"}}><div onClick={()=>d({type:"MODAL",v:"part-detail",d:i})} style={{cursor:"pointer"}}><div className="rc-jcn">{i.name}</div><div style={{fontSize:11,color:"var(--mt)",marginTop:1}}>{i.sku}{(i.serial||i.esn)?` · ESN ${i.serial||i.esn}`:""}</div>{(()=>{const lv=uwLevel(i);const dd=i.stageDate?Math.floor((Date.now()-new Date(i.stageDate).getTime())/864e5):null;return(lv||dd!=null)?(<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{dd!=null&&<span style={{fontSize:12,color:dd>7?"var(--w)":"var(--mt)",border:"1px solid "+(dd>7?"var(--w)":"var(--ln)"),borderRadius:8,padding:"0 5px"}}>{dd}d here</span>}{lv&&<span style={{fontSize:12,fontWeight:700,color:lv==="crit"?"var(--r)":"var(--w)",border:"1px solid "+(lv==="crit"?"var(--r)":"var(--w)"),borderRadius:8,padding:"0 5px"}}>⚠ {Math.round(uwRatio(i)*100)}% of list</span>}</div>):null;})()}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5,fontSize:12}}><span style={{color:"var(--tx2)"}}>Cost {$$(costBasis(i))}</span><span style={{color:"var(--act)",fontWeight:600}}>{i.price>0?$$(i.price):"Core"}</span></div><div style={{display:"flex",gap:4,marginTop:6}}><button className="rc-bs rc-bmv" disabled={idx<=0} aria-label={idx>0?"Move "+(i.name||i.sku)+" back to "+engStatusLabel(ENG_STATUSES[idx-1]):undefined} title={idx>0?"Back to "+engStatusLabel(ENG_STATUSES[idx-1]):undefined} onClick={()=>moveTo(i.id,ENG_STATUSES[idx-1])}>←</button><button className="rc-bs rc-bmv" disabled={idx>=ENG_STATUSES.length-1} aria-label={idx<ENG_STATUSES.length-1?"Move "+(i.name||i.sku)+" on to "+engStatusLabel(ENG_STATUSES[idx+1]):undefined} title={idx<ENG_STATUSES.length-1?"On to "+engStatusLabel(ENG_STATUSES[idx+1]):undefined} onClick={()=>moveTo(i.id,ENG_STATUSES[idx+1])}>→</button></div></div>);})}</div><div style={{padding:"5px 10px",borderTop:"1px solid var(--ln)",fontSize:11,color:"var(--mt)",display:"flex",justifyContent:"space-between"}}><span>basis</span><span>{$K(stCost)}</span></div></div>);})}</div>
  </div>);}
  return (<div>
    <div className="rc-g4"><Stat label="Engines" value={engs.length}/><Stat label="Available" value={avail}/><Stat label="Advertised" value={listed+" / "+(engs.filter(i=>engStatus(i)!=="sold").length)}/><Stat label="Stock Value" value={$K(tv)}/></div>
    <SH title="Inventory"><button className="rc-fb" onClick={()=>setView("board")}>🔧 Reman Board</button><button className="rc-fb" onClick={()=>d({type:"MODAL",v:"qr-tags",d:{ids:null}})}>🏷 QR tags</button><button className="rc-fb" onClick={()=>d({type:"MODAL",v:"sku-renumber"})}>🔢 Renumber SKUs</button><input className="rc-si" placeholder="Search name, SKU, ESN, CPL..." value={q} onChange={e=>sq(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-part",d:{cat:"Complete Engine",status:"available"}})}>+ Engine</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-part"})}>+ Part</button></SH>
    {(()=>{const E=s.inventory.filter(isEngine);if(!E.length)return null;const av=E.filter(i=>engStatus(i)==="available");const M=[["📷 Photos",E.filter(i=>i.photo).length,E.length],["📣 Listed",av.filter(i=>(i.listedOn||[]).length>0).length,av.length],["💲 Cost",E.filter(i=>costBasis(i)>0).length,E.length],["🔢 ESN",E.filter(i=>i.serial||i.esn).length,E.length]];const full=M.every(([l,n,t])=>t===0||n===t);return(<div className="rc-lm">{M.map(([l,n,t],i)=>(<div key={i} className={"rc-lm-c"+(t>0&&n===t?" done":"")}><span className="rc-lm-l">{l}</span><span className="rc-lm-n">{t===0?"—":n+"/"+t}</span><div className="rc-lm-b"><div style={{width:(t>0?n/t*100:0)+"%"}}/></div></div>))}{full&&<span className="rc-lm-full">🏁 FULL LOT</span>}</div>);})()}
    <Fil opts={[["all","All"],["engines","Engines"],["available","Available"],["unlisted","Not Listed"],["in-reman","In Reman"],["on-hold","On Hold"],["sold","Sold"],["parts","Parts"]]} active={f} set={sf}/>
    {aiR&&(<div className="rc-card rc-ai-res" style={{padding:16,borderColor:"var(--p)",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--p)",letterSpacing:2,textTransform:"uppercase",fontSize:14.5}}>✨ AI Listing — {aiR.item.name}</span><button className="rc-bs" onClick={()=>setAiR(null)} style={{fontSize:14.5}}>✕</button></div><div style={{background:"var(--sf2)",borderRadius:6,padding:14,fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiR.text}</div><BtnRow><button className="rc-ba" onClick={()=>navigator.clipboard.writeText(aiR.text)}>📋 Copy</button><button className="rc-bs" onClick={()=>genListing(aiR.item)} style={{color:"var(--p)",borderColor:"var(--p)"}}>🔄</button></BtnRow></div>)}
    {fl.length===0?(<Empty icon="📦" title="No Inventory" sub="Add parts" action={()=>d({type:"MODAL",v:"add-part"})} label="+ Add"/>):(<Tbl fit headers={[{h:"",cls:"rc-eng-ph"},"Engine / Part",{h:"SKU",cls:"rc-sm-hide"},{h:"Cost Basis",cls:"rc-sm-hide"},{h:"Sell",cls:"rc-sm-hide"},{h:"Margin",cls:"rc-sm-hide"},{h:"Status",cls:"rc-sm-hide"},""]}>{fl.map(i=>{const eng=isEngine(i);const m=marginPct(i);const stc=(eng?(<>{<Badge s={engStatus(i)}/>}{engStatus(i)==="available"&&i.stageDate&&(()=>{const dl=Math.floor((Date.now()-new Date(i.stageDate).getTime())/864e5);return <div style={{fontSize:12,color:dl>=60?"var(--w)":"var(--mt)",marginTop:3}}>{dl}d on lot{dl>=90?" · −10%?":dl>=60?" · −5%?":""}</div>;})()}{uwLevel(i)&&<div style={{fontSize:12,fontWeight:700,color:uwLevel(i)==="crit"?"var(--r)":"var(--w)",marginTop:3}}>⚠ {Math.round(uwRatio(i)*100)}% of list</div>}</>):<><div className="rc-qty" style={{marginBottom:3}}><button className="rc-qb" aria-label={"One less "+(i.name||i.sku)} onClick={()=>d({type:"UPDATE",list:"inventory",id:i.id,d:{qty:Math.max(0,i.qty-1)}})}>−</button><span className="rc-qv">{i.qty}</span><button className="rc-qb" aria-label={"One more "+(i.name||i.sku)} onClick={()=>d({type:"UPDATE",list:"inventory",id:i.id,d:{qty:i.qty+1}})}>+</button></div><Badge s={stk(i)==="ok"?"in-stock":stk(i)}/></>);return (<tr key={i.id}><td className="rc-eng-ph">{i.photo?(<img src={i.photo} alt="" onClick={()=>d({type:"MODAL",v:"part-detail",d:i})} className="rc-eng-img"/>):(<div onClick={()=>d({type:"MODAL",v:eng?"part-detail":"edit-part",d:i})} className="rc-eng-img none" title="Open">{eng?"🔧":"📷"}</div>)}</td><td onClick={()=>eng&&d({type:"MODAL",v:"part-detail",d:i})} style={{cursor:eng?"pointer":"default"}}>{eng?<button className="rc-lnk rc-tn" onClick={e=>{e.stopPropagation();d({type:"MODAL",v:"part-detail",d:i});}}>{i.name}</button>:<div className="rc-tn">{i.name}</div>}<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--mt)"}}><span style={{color:"var(--act)",fontWeight:600}}>{i.price>0?$$(i.price):eng?"Core":"No price"}</span>{i.sku?" · "+i.sku:""}{eng?" · cost "+$$(costBasis(i)):""}</div>{eng&&(i.serial||i.esn)&&<div style={{fontSize:12,color:"var(--mt)"}}>ESN {i.serial||i.esn}</div>}{eng&&locs.has(i.id)&&<div className="rc-s3-loc" role="button" tabIndex={0} title="Show in the 3D shop" onClick={e=>{e.stopPropagation();d({type:"TAB",v:"shop3d",focus:i.id});}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();d({type:"TAB",v:"shop3d",focus:i.id});}}}>📍 {areaTitle(locs.get(i.id))}</div>}{eng&&(i.listedOn||[]).length>0?<div style={{display:"flex",gap:3,marginTop:2}}>{(i.listedOn||[]).map(ck=>{const c=chan(ck);return <span key={ck} style={{fontSize:12,fontFamily:"var(--fb)",color:c.col,border:`1px solid ${c.col}`,borderRadius:2,padding:"0 3px",letterSpacing:.5}}>{c.ab}</span>;})}</div>:(eng&&engStatus(i)==="available"?<div style={{fontSize:12,color:"var(--mt)",marginTop:2,fontStyle:"italic"}}>not advertised</div>:null)}<div className="rc-sm-only" style={{marginTop:6}}>{stc}</div></td><td className="rc-sm-hide" style={{color:"var(--mt)",fontSize:13,whiteSpace:"nowrap"}}>{i.sku}</td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)"}}>{$$(costBasis(i))}</td><td className="rc-sm-hide" style={{color:"var(--act)",fontWeight:600}}>{i.price>0?$$(i.price):"Core"}</td><td className="rc-sm-hide" style={{fontSize:13,color:m>40?"var(--g)":m>0?"var(--w)":"var(--r)"}}>{i.price>0?m.toFixed(0)+"%":"—"}</td><td className="rc-sm-hide">{stc}</td><td><BtnRow>{eng&&engStatus(i)==="available"&&<button className="rc-bs" onClick={()=>genListing(i)} disabled={aiL===i.id} aria-label={"Write a listing for "+(i.name||i.sku)+" with AI"} title="Write a listing with AI" style={{fontSize:12,color:"var(--p)",borderColor:"var(--p)"}}>{aiL===i.id?"⏳":"✨"}</button>}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-part",d:i})} aria-label={"Edit "+(i.name||i.sku)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"inventory",id:i.id})} aria-label={"Delete "+(i.name||i.sku)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>);})}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// SHOP 3D — the shop and yard as a 3D model, with the real engines where they're kept
// ═══════════════════════════════════════════════════════════════
// The scene (src/shop3d/scene.js, three.js) loads on demand the first time this view opens.
// The crew (src/shop3d/crew.js): every active Team member at a work spot, working 8:00 AM to
// 4:00 PM on weekdays; each hour that finishes, their hourly wage pops up over them (owner only).
// SHOP MAP 2D: the same plan from above, to scale in feet: every place, every engine spot (dashed
// when empty) and the engines in them, coloured by status. Same spots as the 3D shop.
function ShopMap2D({list,plan,count,selA,selE,zoom,moving,onArea,onEngine,onMove}){
  // who's in each spot ("area:k" → engine), from the same plan the 3D scene uses
  const at={};list.forEach(e=>{const p=plan.get(e.id);if(p)at[p.area+":"+p.k]=e;});
  const svgRef=useRef(null);const[drag,setDrag]=useState(null);
  const toSvg=ev=>{const sv=svgRef.current;const m=sv&&sv.getScreenCTM();if(!m)return null;const pt=sv.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(m.inverse());return{x:q.x,z:q.y};};
  const spotAt=(x,z)=>{let best=null,bd=3.4;Object.entries(SLOTS).forEach(([aid,slots])=>slots.forEach((sl,k)=>{const dd=Math.hypot(sl.x-x,sl.z-z);if(dd<bd){bd=dd;best={aid,k};}}));return best;};
  const down=(ev,e)=>{if(ev.button>0)return;const q=toSvg(ev);if(!q)return;ev.preventDefault();try{svgRef.current.setPointerCapture(ev.pointerId);}catch(x){}setDrag({id:e.id,x0:q.x,z0:q.z,x:q.x,z:q.z,over:null,moved:false});};
  const move=ev=>{if(!drag)return;const q=toSvg(ev);if(!q)return;const moved=drag.moved||Math.hypot(q.x-drag.x0,q.z-drag.z0)>1.2;setDrag({...drag,x:q.x,z:q.z,moved,over:moved?spotAt(q.x,q.z):null});};
  const up=()=>{if(!drag)return;const g=drag;setDrag(null);
    if(!g.moved){const p=plan.get(g.id);if(moving&&!sameId(moving,g.id)&&p){onMove(moving,p.area,p.k);return;}onEngine(g.id);return;}
    if(g.over)onMove(g.id,g.over.aid,g.over.k);};
  const bx=zoom==="shop"?BLDG:zoom&&AREA_BY_ID[zoom]?AREA_BY_ID[zoom]:{x0:0,x1:LOT.w,z0:-1,z1:LOT.d+5};
  const pad=zoom?7:3,vx=bx.x0-pad,vz=bx.z0-pad,vw=bx.x1-bx.x0+pad*2,vh=bx.z1-bx.z0+pad*2;
  const R=AREA_BY_ID.reman;const key=f=>e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();f();}};
  return(<svg ref={svgRef} className={"rc-map2d"+(drag&&drag.moved||moving?" dragging":"")} viewBox={vx+" "+vz+" "+vw+" "+vh} preserveAspectRatio="xMidYMid meet" role="group" aria-label="The shop and lot from above, to scale. Drag an engine onto a spot to move it." onPointerMove={move} onPointerUp={up} onPointerCancel={()=>setDrag(null)}>
    <rect className="m-lot" x={0} y={0} width={LOT.w} height={LOT.d}/>
    {SHOP_AREAS.map(a=>(<g key={a.id} className={"m-area"+(selA===a.id?" on":"")} role="button" tabIndex={0} aria-label={a.title+(a.store?", "+(count[a.id]||0)+" engines":"")} onClick={()=>onArea(a.id)} onKeyDown={key(()=>onArea(a.id))}>
      <rect x={a.x0} y={a.z0} width={a.w} height={a.d} style={{fill:tint(a.dot,a.store?18:9),stroke:tint(a.dot,75)}}/></g>))}
    <rect className="m-bldg" x={BLDG.x0} y={BLDG.z0} width={BLDG.x1-BLDG.x0} height={BLDG.z1-BLDG.z0}/>
    {Object.entries(SLOTS).map(([aid,slots])=>slots.map((sl,k)=>{const[w0,d0]=SLOT_SIZE[aid]||SLOT_SIZE.default;const turn=Math.abs(Math.sin(sl.ry||0))>0.5;const W=turn?d0:w0,D=turn?w0:d0;const e=at[aid+":"+k];const x=sl.x-W/2,y=sl.z-D/2;
      const over=drag&&drag.over&&drag.over.aid===aid&&drag.over.k===k;const name=areaTitle(aid)+", spot "+(k+1);
      if(!e)return <rect key={aid+k} className={"m-slot"+(over?" drop":"")} x={x} y={y} width={W} height={D} rx={0.3} role={moving?"button":undefined} tabIndex={moving?0:undefined} aria-label={moving?"Move here: "+name+" (empty)":undefined} onClick={moving?ev=>{ev.stopPropagation();onMove(moving,aid,k);}:undefined} onKeyDown={moving?key(()=>onMove(moving,aid,k)):undefined}><title>{name+" · empty"}</title></rect>;
      const c=BC[e.status]||"var(--mt)";const lab=String(e.sku||e.name||"").slice(0,8);
      return(<g key={aid+k} className={"m-eng"+(selE===e.id?" on":"")+(over?" drop":"")+(drag&&drag.moved&&drag.id===e.id?" lifted":"")} role="button" tabIndex={0} aria-label={(e.sku?e.sku+", ":"")+e.name+", "+e.statusLabel+", "+name} onPointerDown={ev=>down(ev,e)} onKeyDown={key(()=>moving&&!sameId(moving,e.id)?onMove(moving,aid,k):onEngine(e.id))}>
        <title>{(e.sku?e.sku+" · ":"")+e.name+" · "+e.statusLabel}</title>
        <rect x={x} y={y} width={W} height={D} rx={0.35} style={{fill:tint(c,38),stroke:c}}/>
        <text className="m-et" x={sl.x} y={sl.z+0.4} transform={turn?"rotate(-90 "+sl.x+" "+sl.z+")":undefined}>{lab}</text></g>);}))}
    {drag&&drag.moved&&(()=>{const e=list.find(o=>sameId(o.id,drag.id));if(!e)return null;const c=BC[e.status]||"var(--mt)";return(<g className="m-ghost" aria-hidden="true"><rect x={drag.x-3} y={drag.z-2} width={6} height={4} rx={0.35} style={{fill:tint(c,55),stroke:c}}/><text className="m-et" x={drag.x} y={drag.z+0.4}>{String(e.sku||e.name||"").slice(0,8)}</text></g>);})()}
    <g className="m-dim" aria-hidden="true"><line x1={R.x0} y1={R.z1+1.6} x2={R.x1} y2={R.z1+1.6}/><line x1={R.x0} y1={R.z1+0.9} x2={R.x0} y2={R.z1+2.3}/><line x1={R.x1} y1={R.z1+0.9} x2={R.x1} y2={R.z1+2.3}/><text x={R.cx} y={R.z1+3.7}>20 ft</text>
      <line x1={R.x1+1.6} y1={R.z0} x2={R.x1+1.6} y2={R.z1}/><line x1={R.x1+0.9} y1={R.z0} x2={R.x1+2.3} y2={R.z0}/><line x1={R.x1+0.9} y1={R.z1} x2={R.x1+2.3} y2={R.z1}/><text transform={"translate("+(R.x1+3.4)+" "+R.cz+") rotate(90)"}>36 ft</text></g>
    <g className="m-labels" aria-hidden="true">{SHOP_AREAS.map(a=>{const tall=a.w<12&&a.d>a.w;const n=count[a.id]||0;const cnt=n+" engine"+(n===1?"":"s")+" · "+(SLOT_CAP[a.id]||0)+" spots";
      // the outside pads are full of spots right to their edge, so their label sits just above them
      if(a.store&&a.kind==="Outside"&&a.id!=="yard"&&!tall)return(<g key={a.id}><text className="m-at" x={a.x0} y={a.z0-2.4}>{a.name}{a.sub?" · "+a.sub:""}</text><text className="m-ac" x={a.x0} y={a.z0-0.7}>{cnt}</text></g>);
      return(<g key={a.id}>
      <text className="m-at" transform={tall?"translate("+(a.x0+2.1)+" "+(a.z1-1.2)+") rotate(-90)":"translate("+(a.x0+0.9)+" "+(a.z0+2.2)+")"}>{a.name}{a.sub&&!tall?" · "+a.sub:""}</text>
      {a.store&&!tall&&<text className="m-ac" x={a.x0+0.9} y={a.z0+4}>{cnt}</text>}</g>);})}</g>
    <g className="m-scale" aria-hidden="true" transform={"translate("+(vx+1.5)+" "+(vz+vh-1.4)+")"}><line x1={0} y1={0} x2={10} y2={0}/><line x1={0} y1={-0.6} x2={0} y2={0.6}/><line x1={10} y1={-0.6} x2={10} y2={0.6}/><text x={11} y={0.5}>10 ft</text></g>
    <text className="m-street" x={20} y={LOT.d+3.6}>STREET</text>
    <text className="m-north" x={vx+vw-1.5} y={vz+2.6}>N →</text>
  </svg>);
}
const S3_COARSE=typeof window!=="undefined"&&window.matchMedia?window.matchMedia("(pointer: coarse)").matches:false;
const S3_SEC_H=6; // Play the day: 6 seconds an hour, the whole day in 48 seconds
function Shop3D({s,d,theme,owner}){
  const gl=useRef(null);const api=useRef(null);
  const[ready,setReady]=useState(false);const[err,setErr]=useState("");const[prog,setProg]=useState(["Loading the 3D shop…",4]);
  const[selA,setSelA]=useState(null);const[selE,setSelE]=useState(null);const[selP,setSelP]=useState(null);const[hint,setHint]=useState(true);
  const[tod,setTod]=useState(theme==="night"?"night":"day");const[walls,setWalls]=useState("cut");const[roofs,setRoofs]=useState(false);const[labels,setLabels]=useState(true);const[tour,setTour]=useState(false);const[drive,setDrive]=useState(false);
  const[crewOn,setCrewOn]=useState(true);const[clk,setClk]=useState(()=>shopClock());const[play,setPlay]=useState(null);
  // 3D or the 2D map (remembered per device); the 3D scene only loads while 3D is showing.
  const[mode,setMode]=useState(()=>getPref("rc:shopView","3d")==="2d"?"2d":"3d");const[zoom,setZoom]=useState(null);
  // Moving an engine: drop it on a spot (the 2D map) and it's kept there; an engine already in that spot swaps places with it.
  const[moving,setMoving]=useState(null);
  const moveEng=(id,aid,k)=>{const e=engs.find(x=>sameId(x.id,id));if(!e)return;const pE=plan.get(e.id);const occ=list.find(o=>{const p=plan.get(o.id);return p&&p.area===aid&&p.k===k;});setMoving(null);
    if(occ&&sameId(occ.id,e.id))return;
    d({type:"UPDATE",list:"inventory",id:e.id,d:{loc:aid,spot:k}});
    if(occ)d({type:"UPDATE",list:"inventory",id:occ.id,d:pE?{loc:pE.area,spot:pE.k}:{spot:null}});
    setSelE(e.id);setSelA(null);setSelP(null);
    d({type:"TOAST",d:{msg:"📍 "+(e.sku||e.name||"Engine")+" → "+areaTitle(aid)+" · spot "+(k+1)+(occ?" · swapped with "+(occ.sku||occ.name||"the engine there"):""),t:Date.now()}});};
  useEffect(()=>{if(!moving)return;const k=e=>{if(e.key==="Escape"){e.preventDefault();setMoving(null);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[moving]);
  const pickMode=m=>{if(m===mode)return;setMode(m);setPref("rc:shopView",m);setReady(false);setErr("");setProg(["Loading the 3D shop…",4]);setTour(false);setDrive(false);};
  const engs=(s.inventory||[]).filter(isEngine);
  const locs=useMemo(()=>engLocs(s),[s.inventory]);
  const list=useMemo(()=>engs.filter(i=>locs.has(i.id)).map(i=>({id:i.id,sku:i.sku||"",name:i.name||"",area:locs.get(i.id),spot:i.loc&&i.loc===locs.get(i.id)?i.spot:null,status:engStatus(i),statusLabel:engStatusLabel(engStatus(i)),size:sizeClass(i),remanned:remanned(i)})),[s.inventory,locs]);
  const plan=useMemo(()=>placeEngines(list),[list]);

  const crew=useMemo(()=>crewList(s.employees),[s.employees]);
  const crewScene=useMemo(()=>crew.filter(c=>c.spot).map(c=>({id:c.id,name:c.name,short:c.short,role:c.role,spot:c.spot})),[crew]);
  const playing=!!(play&&play.t0);
  const working=playing?clk.min<SHIFT.end:onShift(clk.date,clk.min);
  const worked=playing?Math.max(0,clk.min-SHIFT.start):workedMin(clk.date,clk.min);
  const listRef=useRef(list);listRef.current=list;const crewRef=useRef(crew);crewRef.current=crew;const crewSceneRef=useRef(crewScene);crewSceneRef.current=crewScene;
  const ownerRef=useRef(owner);ownerRef.current=owner;const crewOnRef=useRef(crewOn);crewOnRef.current=crewOn;
  const start=useRef({tod,walls,roofs,labels});
  useEffect(()=>{if(mode!=="3d")return;let dead=false;
    import("./shop3d/scene.js").then(m=>{if(dead||!gl.current)return;const o=start.current;
      api.current=m.createShop(gl.current,{engines:listRef.current,crew:crewSceneRef.current,tod:o.tod,walls:o.walls,roofs:o.roofs,labels:o.labels,
        onProgress:(t,p)=>setProg([t,p]),onReady:()=>setReady(true),onError:msg=>setErr(msg),onInteract:()=>setHint(false),
        onSelectArea:id=>{setSelA(id);setSelE(null);setSelP(null);},onSelectEngine:id=>{setSelE(id);setSelA(null);setSelP(null);},onSelectPerson:id=>{setSelP(id);setSelA(null);setSelE(null);},onTour:v=>setTour(v),onDrive:v=>setDrive(v)});})
      .catch(()=>{if(!dead)setErr("The 3D shop didn't load. Check your connection, then open this page again.");});
    return()=>{dead=true;if(api.current){api.current.dispose();api.current=null;}};},[mode]);
  // On the 2D map, picking an engine or a place zooms to it.
  useEffect(()=>{if(mode!=="2d")return;if(selE){const a=locs.get(selE);if(a)setZoom(a);}else if(selA&&SLOTS[selA])setZoom(selA);},[selE,selA,mode]);
  useEffect(()=>{if(api.current)api.current.setEngines(list);},[list]);
  useEffect(()=>{if(api.current)api.current.setCrew(crewScene);},[crewScene]);
  useEffect(()=>{if(api.current)api.current.setCrewOn(crewOn&&working);},[crewOn,working,ready]);
  // The crew's clock: Medicine Hat time, or the day replayed. Each hour that finishes pays out
  // every working person's wage, popping up over them (only the owner sees money).
  useEffect(()=>{let prev=null;
    const tick=()=>{
      const now=playing?{date:"play",min:Math.min(SHIFT.end,SHIFT.start+(performance.now()-play.t0)/1000/S3_SEC_H*60)}:shopClock();
      if(prev&&prev.date===now.date&&ownerRef.current&&crewOnRef.current&&api.current&&hoursDone(prev.min,now.min).some(h=>playing||now.min-h<2))
        crewRef.current.forEach(c=>{if(c.spot&&c.rate>0)api.current.pay(c.id,$$(c.rate));});
      prev=now;setClk(now);
      if(playing&&now.min>=SHIFT.end)setPlay({done:true});
    };
    tick();const iv=setInterval(tick,playing?250:1000);return()=>clearInterval(iv);},[play]);
  useEffect(()=>{if(!play||!play.done)return;const t=setTimeout(()=>setPlay(null),8000);return()=>clearTimeout(t);},[play]);
  // "Show in 3D" from an engine's passport or the Engines list lands here with that engine picked.
  useEffect(()=>{if(!s.focus)return;setSelE(s.focus);setSelA(null);setSelP(null);if(ready&&api.current)api.current.selectEngine(s.focus);},[s.focus,ready]);
  const A=f=>{if(api.current)f(api.current);};
  const pickArea=id=>{setSelA(id);setSelE(null);setSelP(null);A(a=>a.selectArea(id));};
  const pickEng=id=>{setSelE(id);setSelA(null);setSelP(null);A(a=>a.selectEngine(id));};
  const pickPerson=id=>{setSelP(id);setSelA(null);setSelE(null);setTour(false);A(a=>a.selectPerson(id));};
  const togglePlay=()=>{if(playing){setPlay(null);return;}setDrive(false);A(a=>a.setDrive(false));setCrewOn(true);setPlay({t0:performance.now()});};
  const clockTxt=Tsh.fmtTime(Math.floor(clk.min));
  const whoHere=id=>crew.filter(c=>c.spot&&c.spot.area===id);
  const count={};locs.forEach(a=>{count[a]=(count[a]||0)+1;});
  const bySku=(a,b)=>String(a.sku||a.name||"").localeCompare(String(b.sku||b.name||""),undefined,{numeric:true});
  const panel=(()=>{
    const ie=selE?engs.find(x=>x.id===selE):null;
    if(ie){const lo=locs.get(ie.id)||"";const st=engStatus(ie);const own=ie.loc&&STORE_IDS.includes(ie.loc)?ie.loc:"";
      const auto=st==="sold"?"":shopLocs(engs.map(x=>x.id===ie.id?{...x,loc:""}:x),{status:engStatus,remanned}).get(ie.id)||"";
      const over=lo&&(count[lo]||0)>(SLOT_CAP[lo]||0);
      return(<div className="rc-card rc-s3-card" aria-live="polite">
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div style={{minWidth:0}}><div className="rc-ml">{ie.sku||"Engine"}</div><div className="rc-s3-h">{ie.name}</div>{(ie.serial||ie.esn)&&<div className="rc-s3-sub">ESN {ie.serial||ie.esn}</div>}</div><Badge s={st}/></div>
        <div className="rc-s3-where">📍 <b>{lo?areaTitle(lo):"Not on the map"}{plan.get(ie.id)?" · spot "+(plan.get(ie.id).k+1):""}</b>{lo&&!own?<span> · placed by status</span>:null}</div>
        {over&&<div className="rc-s3-warn">{areaTitle(lo)} has more engines than spots, so a few aren't drawn. They're all listed on the area's card.</div>}
        <label className="rc-fl" htmlFor="s3-loc">Where it's kept</label>
        <select id="s3-loc" className="rc-fi" value={own} onChange={e=>d({type:"UPDATE",list:"inventory",id:ie.id,d:{loc:e.target.value,spot:null}})} style={{appearance:"none"}}>
          <option value="">{st==="sold"?"Off the map (sold)":"By status · "+areaTitle(auto)}</option>
          {STORE_IDS.map(id=>(<option key={id} value={id}>{areaTitle(id)}</option>))}
        </select>
        <div className="rc-fa" style={{flexWrap:"wrap"}}>{st==="sold"&&own?<button className="rc-bs" onClick={()=>d({type:"UPDATE",list:"inventory",id:ie.id,d:{loc:""}})}>Picked up · take it off the map</button>:null}<button className="rc-bs" onClick={()=>{setSelE(null);A(a=>a.selectArea(null));}}>Close</button><button className="rc-bs" onClick={()=>{pickMode("2d");setMoving(ie.id);}}>{moving&&sameId(moving,ie.id)?"Tap a spot on the map…":"Move to a spot"}</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"part-detail",d:ie})}>Open passport</button></div>
        <div className="rc-s3-note">On the 2D map, drag an engine onto any spot. A spot that's taken swaps the two engines.</div>
      </div>);}
    const ip=selP!=null?crew.find(c=>String(c.id)===String(selP)):null;
    if(ip){const auto=crewList((s.employees||[]).map(e=>String(e.id)===String(ip.id)?{...e,station:""}:e)).find(c=>String(c.id)===String(ip.id));
      const taken=ip.station&&ip.how!=="picked"?crew.find(c=>c.how==="picked"&&c.station===ip.station):null;
      return(<div className="rc-card rc-s3-card" aria-live="polite">
        <div className="rc-s3-chips"><span className="rc-s3-chip k">Crew</span>{ip.role&&<span className="rc-s3-chip">{ip.role}</span>}</div>
        <div className="rc-s3-h big">{ip.name}</div>
        <div className="rc-s3-where">📍 <b>{ip.spot?ip.spot.label:"No room on the map"}</b>{ip.spot&&ip.how==="role"?<span> · placed by role</span>:null}</div>
        {taken&&<div className="rc-s3-warn">{taken.name} already works at {(CREW_SPOTS.find(p=>p.id===ip.station)||{}).label}, so {ip.short} is placed by role.</div>}
        <div className="rc-s3-crewst">{working?(playing?"Working · replaying the day":"Working · "+Math.floor(worked/60)+" h "+Math.floor(worked%60)+" min so far today"):"Off now, "+backAt(clk.date,clk.min)}</div>
        {owner&&<div className="rc-s3-meter"><span>{ip.rate>0?$$(ip.rate)+" an hour · "+(playing?"so far in the replay":"today"):"No pay rate on the Team tab"}</span><b>{$$(ip.rate*worked/60)}</b></div>}
        <label className="rc-fl" htmlFor="s3-station">Works at</label>
        <select id="s3-station" className="rc-fi" value={CREW_SPOTS.some(p=>p.id===ip.station)?ip.station:""} onChange={e=>d({type:"UPDATE",list:"employees",id:ip.id,d:{station:e.target.value}})} style={{appearance:"none"}}>
          <option value="">{"By role · "+(auto&&auto.spot?auto.spot.label:"no room on the map")}</option>
          {CREW_SPOTS.map(p=>(<option key={p.id} value={p.id}>{p.label}</option>))}
        </select>
        <div className="rc-fa"><button className="rc-bs" onClick={()=>{setSelP(null);A(x=>x.selectArea(null));}}>Close</button></div>
      </div>);}
    const a=selA?AREA_BY_ID[selA]:null;
    if(a){const here=engs.filter(i=>locs.get(i.id)===a.id).sort(bySku);const cap=SLOT_CAP[a.id]||0;const k=PLACE_ORDER.indexOf(a.id);
      return(<div className="rc-card rc-s3-card" aria-live="polite">
        <div className="rc-s3-chips"><span className="rc-s3-chip k">{a.kind}</span><span className="rc-s3-chip">About {Math.round(a.w)} × {Math.round(a.d)} ft</span></div>
        <div className="rc-s3-h big">{a.title}</div>
        <p className="rc-s3-p">{a.blurb}</p>
        <ul className="rc-s3-ul">{a.items.map(t=>(<li key={t}>{t}</li>))}</ul>
        {a.store&&(<><div className="rc-fl" style={{marginTop:6}}>Engines here · {here.length}{cap?" · "+cap+" spots":""}</div>
          {here.length===0?<div className="rc-s3-empty">No engines here right now.</div>:<div className="rc-s3-elist">{here.map(i=>(<button key={i.id} className="rc-s3-erow" onClick={()=>pickEng(i.id)}><span style={{minWidth:0}}><b>{i.sku||"Engine"}</b><span>{i.name}</span></span><Badge s={engStatus(i)}/></button>))}</div>}
          {here.length>cap&&<div className="rc-s3-warn">{here.length-cap} more than fit on the map. They're still listed here.</div>}</>)}
        {whoHere(a.id).length>0&&(<><div className="rc-fl" style={{marginTop:6}}>Crew here</div><div className="rc-s3-elist">{whoHere(a.id).map(c=>(<button key={c.id} className="rc-s3-erow" onClick={()=>pickPerson(c.id)}><span style={{minWidth:0}}><b>{c.name}</b><span>{c.spot.label}{c.role?" · "+c.role:""}</span></span></button>))}</div></>)}
        <div className="rc-fa"><button className="rc-bs" onClick={()=>pickArea(PLACE_ORDER[(k-1+PLACE_ORDER.length)%PLACE_ORDER.length])}>← Previous</button><button className="rc-bs" onClick={()=>pickArea(PLACE_ORDER[(k+1)%PLACE_ORDER.length])}>Next →</button><button className="rc-bs" onClick={()=>{setSelA(null);A(x=>x.selectArea(null));}}>Close</button></div>
      </div>);}
    const away=(s.employees||[]).filter(e=>e&&e.status&&e.status!=="active");
    const crewCard=(<div className="rc-card rc-s3-card">
      <div className="rc-s3-hrow"><div className="rc-s3-h">Crew</div><span className="rc-s3-sub">8:00 AM to 4:00 PM · Mon to Fri</span></div>
      <div className="rc-s3-crewst">{playing?"Replaying the day · "+clockTxt:working?"Working now · "+crew.filter(c=>c.spot).length+" on the floor":"Off now, "+backAt(clk.date,clk.min)}</div>
      {owner&&crew.length>0&&(working||worked>0)&&<div className="rc-s3-meter"><span>{playing?"Wages so far in the replay":"Wages so far today"}</span><b>{$$(wagesSoFar(crew,worked))}</b></div>}
      {crew.length===0?<div className="rc-s3-empty">Nobody on the Team yet. People you add under Team show up here, at work.</div>
        :<div className="rc-s3-elist">{crew.map(c=>(<button key={c.id} className="rc-s3-erow" onClick={()=>pickPerson(c.id)}><span style={{minWidth:0}}><b>{c.name}</b><span>{c.spot?c.spot.label:"No room on the map"}{c.role?" · "+c.role:""}</span></span>{owner&&<small className="rc-s3-rate">{c.rate>0?$$(c.rate)+"/h":"No rate"}</small>}</button>))}</div>}
      {away.length>0&&<div className="rc-s3-note">On leave: {away.map(e=>e.name).join(", ")}</div>}
      {crew.length>0&&<div className="rc-fa"><button className={playing?"rc-bs":"rc-ba"} onClick={togglePlay}>{playing?"■ Stop the replay":"▶ Play the day"}</button></div>}
    </div>);
    return(<>{crewCard}<div className="rc-card rc-s3-card">
      <div className="rc-s3-h">Places</div>
      {PLACE_GROUPS.map(([g,ids])=>(<div key={g}><div className="rc-s3-pg">{g}</div>{ids.map(id=>{const ar=AREA_BY_ID[id];const n=count[id]||0;return(<button key={id} className="rc-s3-pl" style={{"--dot":ar.dot}} onClick={()=>pickArea(id)}><i/><span>{ar.title}</span>{ar.store&&<small>{n} engine{n===1?"":"s"}</small>}</button>);})}</div>))}
      <div className="rc-s3-note">Engines without a set spot are placed by status: in reman on the stands, finished remans in the carport, then cores and runners in the carport while it has room, then take-out. Pick an engine to choose its spot.</div>
    </div></>);
  })();
  const seg=(label,opts,val,set)=>(<div className="rc-seg rc-s3-seg" role="group" aria-label={label}>{opts.map(([k,l])=>(<button key={k} className={val===k?"on":""} aria-pressed={val===k} onClick={()=>set(k)}>{l}</button>))}</div>);
  const pad=(k,g,cls,lab)=>(<button key={k} className={cls} aria-label={lab} onPointerDown={e=>{e.preventDefault();A(a=>a.press(k,true));}} onPointerUp={()=>A(a=>a.press(k,false))} onPointerCancel={()=>A(a=>a.press(k,false))} onPointerLeave={()=>A(a=>a.press(k,false))}>{g}</button>);
  return(<div>
    <div className="rc-s3-tools">
      {seg("View",[["3d","3D"],["2d","2D map"]],mode,pickMode)}
      {mode==="2d"?<>{seg("Zoom",[["lot","Whole lot"],["reman","Carport"],["shop","Shop"]],zoom==="reman"||zoom==="shop"?zoom:"lot",k=>setZoom(k==="lot"?null:k))}{zoom&&zoom!=="reman"&&zoom!=="shop"&&<span className="rc-s3-zoomed">{areaTitle(zoom)}</span>}</>:<>
      {seg("Time of day",[["day","Day"],["dusk","Dusk"],["night","Night"]],tod,k=>{setTod(k);A(a=>a.setTod(k));})}
      {seg("Walls",[["cut","Cutaway"],["up","Walls up"],["down","Walls down"]],walls,k=>{setWalls(k);A(a=>a.setWalls(k));})}
      <button className={"rc-fb"+(roofs?" on":"")} aria-pressed={roofs} onClick={()=>{setRoofs(!roofs);A(a=>a.setRoofs(!roofs));}}>Roofs</button>
      <button className={"rc-fb"+(labels?" on":"")} aria-pressed={labels} onClick={()=>{setLabels(!labels);A(a=>a.setLabels(!labels));}}>Labels</button>
      <button className={"rc-fb"+(crewOn?" on":"")} aria-pressed={crewOn} onClick={()=>setCrewOn(!crewOn)}>Crew</button>
      <button className={"rc-fb"+(tour?" on":"")} aria-pressed={tour} onClick={()=>{const v=!tour;setTour(v);if(v){setDrive(false);setSelE(null);setSelP(null);}A(a=>a.setTour(v));}}>Tour</button>
      <button className="rc-fb" onClick={()=>{setSelA(null);setSelE(null);setSelP(null);setTour(false);setDrive(false);A(a=>a.home());}}>Overview</button>
      <button className={drive?"rc-bs":"rc-ba"} aria-pressed={drive} onClick={()=>{const v=!drive;setDrive(v);if(v){setTour(false);setSelA(null);setSelE(null);setSelP(null);}A(a=>a.setDrive(v));}}>{drive?"Stop driving":"Drive the forklift"}</button></>}
    </div>
    <div className="rc-s3-wrap">
      <div className={"rc-s3-stage"+(mode==="2d"?" m2d":"")}>
        {mode==="2d"?<><ShopMap2D list={list} plan={plan} count={count} selA={selA} selE={selE} zoom={zoom} moving={moving} onArea={id=>{if(moving)return;pickArea(id);}} onEngine={pickEng} onMove={moveEng}/>{moving&&<div className="rc-s3-movebar" role="status">Tap a spot for {(engs.find(x=>sameId(x.id,moving))||{}).sku||"the engine"} · a full spot swaps <button className="rc-bs" onClick={()=>setMoving(null)}>Cancel</button></div>}</>:<>
        <div className="rc-s3-gl" ref={gl}/>
        {ready&&!err&&crew.length>0&&<div className="rc-s3-clock">
          {play&&play.done?<><b>4:00 PM</b><span>That's the day{owner?": "+$$(wagesSoFar(crew,SHIFT_MIN))+" in wages":""}</span></>
          :<><b>{clockTxt}</b><span>{playing?"Replaying the day":working?"Crew working":"Crew's off"}</span>{owner&&(working||worked>0)&&<span className="pay">{$$(wagesSoFar(crew,worked))}</span>}<button className="rc-bs" onClick={togglePlay}>{playing?"■ Stop":"▶ Play the day"}</button></>}
        </div>}
        {!ready&&!err&&<div className="rc-s3-load"><div className="rc-hi" style={{width:46,height:46,fontSize:22}}>RC</div><div className="rc-s3-lt">{prog[0]}</div><div className="rc-s3-bar"><span style={{width:prog[1]+"%"}}/></div></div>}
        {err&&<div className="rc-s3-load"><div className="rc-hi" style={{width:46,height:46,fontSize:22}}>RC</div><div className="rc-s3-lt" style={{maxWidth:360,lineHeight:1.5}}>{err}</div><button className="rc-ba" onClick={()=>pickMode("2d")}>Use the 2D map</button></div>}
        {ready&&hint&&!drive&&<div className="rc-s3-hint">{S3_COARSE?"Drag to turn · Pinch to zoom · Two fingers to move · Tap a place":"Drag to turn · Scroll to zoom · Right-drag to move · Click a place or an engine"}</div>}
        {drive&&<div className="rc-s3-drivebar">Driving the forklift · W A S D or the arrow keys · Esc to stop</div>}
        {drive&&S3_COARSE&&<div className="rc-s3-pad">{pad("w","▲","u","Forward")}{pad("a","◀","l","Turn left")}{pad("s","▼","d","Reverse")}{pad("d","▶","r","Turn right")}</div>}</>}
      </div>
      <div className="rc-s3-side">{panel}</div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// PARTS — Injector Cross-Reference Catalog
// ═══════════════════════════════════════════════════════════════
function Parts({s,d}){
  const[bf,sbf]=useState("all");const[q,sq]=useState("");
  const list=s.parts||[];
  const brands=[...new Set(list.map(p=>p.brand).filter(Boolean))].sort();
  const fl=list.filter(p=>bf==="all"||p.brand===bf).filter(p=>{const t=(q||"").toLowerCase();return !t||[p.brand,p.engine,p.family,p.esn,p.oem,p.aftermarket,p.type].some(v=>(v||"").toLowerCase().includes(t));});
  const totUnits=list.reduce((a,p)=>a+(+p.qty||0),0);
  const totCost=list.reduce((a,p)=>a+(+p.qty||0)*(+p.cost||0),0);
  const totSell=list.reduce((a,p)=>a+(+p.qty||0)*(+p.sell||0),0);
  return (<div>
    <div className="rc-g4"><Stat label="Line Items" value={list.length}/><Stat label="Total Units" value={totUnits}/><Stat label="Inventory Cost" value={$K(totCost)}/><Stat label="Retail Value" value={$K(totSell)}/></div>
    <SH title="Injector Cross-Reference"><input className="rc-si" placeholder="Search part #, engine..." value={q} onChange={e=>sq(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-injector"})}>+ Injector</button></SH>
    <Fil opts={[["all","All"],...brands.map(b=>[b,b])]} active={bf} set={sbf}/>
    {fl.length===0?(<Empty icon="🔧" title="No Injectors" sub="Add injector cross-reference parts" action={()=>d({type:"MODAL",v:"add-injector"})} label="+ Add Injector"/>):(<Tbl fit headers={["Brand",{h:"Engine",cls:"rc-sm-hide"},{h:"Family",cls:"rc-sm-hide"},{h:"OEM Part #",cls:"rc-sm-hide"},{h:"Aftermarket #",cls:"rc-sm-hide"},{h:"Type",cls:"rc-sm-hide"},{h:"Cond",cls:"rc-sm-hide"},"Qty",{h:"Cost",cls:"rc-sm-hide"},"Sell",{h:"Margin",cls:"rc-sm-hide"},""]}>{fl.map(p=>{const m=p.sell>0?((p.sell-(p.cost||0))/p.sell*100):0;return (<tr key={p.id}><td className="rc-tn">{p.brand}<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--mt)",fontWeight:400}}>{[p.engine,p.oem,p.cond].filter(Boolean).join(" · ")}</div></td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--act)"}}>{p.engine}</td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)"}}>{p.family||"—"}</td><td className="rc-sm-hide" style={{fontSize:13}}>{p.oem||"—"}</td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)"}}>{p.aftermarket||"—"}</td><td className="rc-sm-hide" style={{fontSize:13}}>{p.type||"—"}</td><td className="rc-sm-hide" style={{fontSize:13}}>{p.cond||"—"}</td><td style={{fontWeight:600}}>{p.qty||0}</td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)"}}>{p.cost>0?$$(p.cost):"—"}</td><td style={{color:"var(--act)",fontWeight:600}}>{p.sell>0?$$(p.sell):"—"}</td><td className="rc-sm-hide" style={{fontSize:13,color:m>40?"var(--g)":"var(--w)"}}>{p.sell>0&&p.cost>0?m.toFixed(0)+"%":"—"}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-injector",d:p})} aria-label={"Edit "+recName(p)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"parts",id:p.id})} aria-label={"Delete "+recName(p)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>);})}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// ISSUES — Common-issues knowledge base + shop-wide diagnosis log
// ═══════════════════════════════════════════════════════════════
function Boms({s,d}){
  const[sel,setSel]=useState(null);const[need,setNeed]=useState("buy");
  // Start (or reopen) the worksheet for one engine, then jump to its passport.
  const startOn=(b,eng)=>{if(!b||!eng)return;if(!sheetFor(s,eng.id))d({type:"ADD",list:"bomSheets",d:{engineId:eng.id,bomId:b.id,engName:eng.name||eng.sku||"",date:isoToday(),tech:"",wo:"",coreSource:eng.sourceCore||"",rows:newRows(b),notes:""},label:"Worksheet started on "+(eng.name||eng.sku||"engine")});d({type:"MODAL",v:"part-detail",d:{...eng,ptab:"bom"}});};
  const bms=s.boms||[];const bm=bms.find(b=>b.id===sel);
  const setLines=(b,ls)=>d({type:"UPDATE",list:"boms",id:b.id,d:{lines:ls}});
  if(!bm){const shs=(s.bomSheets||[]).map(x=>{const b=bomById(s,x.bomId);const e=engById(s,x.engineId);return{x,b,e,st:b?bomStats(b,x):null};}).filter(r=>r.b&&r.e);
    return(<>
    <SH title="Bill of Materials"><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-vendor"})}>+ Vendor</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-bom"})}>+ New Worksheet</button></SH>
    <div style={{fontSize:13,color:"var(--mt)",marginBottom:14,lineHeight:1.55,maxWidth:780}}>One long block worksheet per engine family, in two parts like the paper form. The <b style={{color:"var(--tx)",fontWeight:500}}>parts order</b> goes out the day the job opens. The <b style={{color:"var(--tx)",fontWeight:500}}>decision sheet</b> gets worked through teardown: each line is reuse, missing or machine shop, and anything left blank gets replaced once the tech signs it off.</div>
    {bms.length===0?<Empty icon="📋" title="No Worksheets Yet" sub="Build the parts list for a family once, then use it on every core that comes in" action={()=>d({type:"MODAL",v:"add-bom"})} label="+ New Worksheet"/>:(<div className="rc-gc">{bms.map(b=>{const ls=b.lines||[];const nO=ls.filter(l=>lineKind(l)==="order").length;const fits=(s.inventory||[]).filter(i=>isEngine(i)&&bomFits(b,i));const mine=(s.bomSheets||[]).filter(x=>+x.bomId===+b.id);
      return(<div key={b.id} className="rc-cc" onClick={()=>setSel(b.id)}>
        <div className="rc-ccn">{b.label}</div>
        <div style={{fontSize:12,color:"var(--mt)",marginBottom:9}}>rev {b.rev||"1.0"}{b.note?" · "+b.note:""}</div>
        <div className="rc-3c"><div><div className="rc-ml">Lines</div><div className="rc-mv">{ls.length}</div></div><div><div className="rc-ml">Order</div><div className="rc-mv" style={{color:"var(--act)"}}>{nO}</div></div><div><div className="rc-ml">Decide</div><div className="rc-mv" style={{color:"var(--w)"}}>{ls.length-nO}</div></div></div>
        <div style={{fontSize:12,color:"var(--tx2)",marginTop:9}}>{fits.length} on the lot · {mine.length} sheet{mine.length===1?"":"s"} started</div>
      </div>);})}</div>)}
    {shs.length>0&&<><SH title="Worksheets In Progress"/><Tbl headers={["Engine","Worksheet","Parts order","Decisions","Missing","Machine",""]}>{shs.map(r=>(<tr key={r.x.id}><td className="rc-tn">{r.e.name||r.e.sku}</td><td style={{color:"var(--tx2)"}}>{r.b.label}</td><td style={{color:r.st.ordered?"var(--g)":"var(--w)"}}>{r.st.ordered?"✓ "+r.x.orderedDate:"not ordered"}</td><td style={{color:r.st.signed?"var(--g)":"var(--tx)"}}>{r.st.signed?"✓ signed off":r.st.ticked+" ticked · open"}</td><td style={{color:"var(--r)"}}>{r.st.miss}</td><td style={{color:"var(--b)"}}>{r.st.mach}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"part-detail",d:{...r.e,ptab:"bom"}})}>Open</button><button className="rc-bs rc-bsr" title="Take this worksheet off the engine — undo from the toast" onClick={()=>d({type:"DELETE",list:"bomSheets",id:r.x.id})}>✕</button></BtnRow></td></tr>))}</Tbl></>}
    {(()=>{const all=[];(s.bomSheets||[]).forEach(x=>{const b=bomById(s,x.bomId);const e=engById(s,x.engineId);if(b&&e)all.push({x,b,e});});
      if(!all.length)return null;
      const buyRows=[];all.forEach(({x,b,e})=>bomBuy(b,x).forEach(z=>buyRows.push({l:z.l,why:z.why,r:sheetRow(x,z.l.id),e})));
      const pick=k=>{const out=[];all.forEach(({x,b,e})=>bomPick(b,x,k).forEach(l=>out.push({l,r:sheetRow(x,l.id),e})));return out;};
      const lists={buy:buyRows,miss:pick("miss"),mach:pick("mach"),reuse:pick("reuse")};
      const list=(lists[need]||[]).slice().sort((a,b2)=>String(a.l.part).localeCompare(String(b2.l.part)));
      const tot=list.reduce((a,z)=>a+(+z.r.cost||0),0);
      return(<><SH title="What The Shop Needs"/>
      <div style={{fontSize:13,color:"var(--mt)",marginBottom:12,lineHeight:1.55,maxWidth:780}}>Every worksheet on the floor in one place. TO BUY is each engine's parts order, plus anything missing from the core, plus whatever a signed-off decision sheet left blank. Click any row to open that engine's worksheet.</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{[["buy","To buy "+lists.buy.length],["miss","Missing from the core "+lists.miss.length],["mach","To the machine shop "+lists.mach.length],["reuse","Reusing "+lists.reuse.length]].map(([k,l])=>(<button key={k} className={"rc-fb"+(need===k?" on":"")} onClick={()=>setNeed(k)}>{l}</button>))}</div>
      {list.length===0?(<div className="rc-card" style={{padding:14,fontSize:13,color:"var(--mt)"}}>Nothing here on any worksheet yet.</div>):(<Tbl headers={["Qty","Part","Engine",need==="buy"?"Why":"Measurement / note",need==="buy"?"Cost":"",""]}>{list.map((z,x)=>(<tr key={z.e.id+"-"+z.l.id+"-"+x}>
        <td style={{color:"var(--mt)",width:48}}>{z.l.qty}</td>
        <td className="rc-tn">{z.l.part}{z.r.pn?<div style={{fontSize:11,color:"var(--g)"}}>PN {z.r.pn}</div>:null}</td>
        <td style={{color:"var(--tx2)"}}>{z.e.name||z.e.sku}</td>
        <td style={{fontSize:12}}>{need==="buy"?<span style={{color:(WHY[z.why]||[])[1],letterSpacing:.5}}>{(WHY[z.why]||[])[0]}</span>:<span style={{color:z.r.meas?"var(--g)":"var(--tx2)"}}>{z.r.meas||z.l.note||""}</span>}</td>
        <td style={{color:"var(--w)",fontSize:12}}>{need==="buy"?((+z.r.cost||0)>0?$$(+z.r.cost):"—"):""}</td>
        <td><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"part-detail",d:{...z.e,ptab:"bom"}})}>Open</button></td>
      </tr>))}</Tbl>)}
      {need==="buy"&&list.length>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,margin:"10px 3px 20px"}}><span style={{color:"var(--tx2)"}}>{list.length} lines to buy across {new Set(list.map(z=>z.e.id)).size} engine(s)</span><span style={{color:"var(--w)"}}>{$$(tot)}</span></div>}
      </>);})()}
    <SH title="Where To Buy"><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-vendor"})}>+ Vendor</button></SH>
    <div style={{fontSize:13,color:"var(--mt)",marginBottom:12,lineHeight:1.55,maxWidth:780}}>Every part line gets a one-tap search at each of these. The ones without a stable search URL of their own go through a Google search locked to that supplier's site, which never breaks. When you find the right part, save the link and part number on the line and it becomes a one-tap reorder.</div>
    {(s.vendors||[]).length===0?<Empty icon="🛒" title="No Suppliers" sub="Add the places you actually buy from" action={()=>d({type:"MODAL",v:"add-vendor"})} label="+ Vendor"/>:(<Tbl headers={["Supplier","What for","Search URL",""]}>{(s.vendors||[]).map(v=>(<tr key={v.id}><td className="rc-tn">{v.name}</td><td style={{color:"var(--tx2)"}}>{v.note||""}</td><td style={{color:"var(--mt)",fontSize:12,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis"}}>{v.search||""}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-vendor",d:v})}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"vendors",id:v.id,label:"Supplier removed"})}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </>);}
  const ls=bm.lines||[];const secs=bomSecs(bm);const nO=ls.filter(l=>lineKind(l)==="order").length;
  return(<>
    <SH title={bm.label}>
      <button className="rc-bs" onClick={()=>setSel(null)}>← All worksheets</button>
      <button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-bom",d:bm})}>✎ Details</button>
      <button className="rc-bs" onClick={()=>{d({type:"MODAL",v:"add-bom",d:{cloneOf:bm.id}});setSel(null);}}>⧉ Clone for another family</button>
      <button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-bomline",d:{bomId:bm.id,sec:secs[secs.length-1]||"",kind:"decide"}})}>+ Line</button>
    </SH>
    {(()=>{const engs=(s.inventory||[]).filter(isEngine);const hit=engs.filter(e=>bomFits(bm,e));const rest=engs.filter(e=>!bomFits(bm,e));
      return(<div className="rc-card" style={{padding:12,marginBottom:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:13,color:"var(--tx2)"}}>Put this worksheet on an engine:</span>
        <select className="rc-fi" value="" onChange={e=>startOn(bm,engById(s,e.target.value))} style={{width:270,appearance:"none",padding:"7px 10px",fontSize:13}}>
          <option value="">Pick an engine…</option>
          {hit.map(e=>(<option key={e.id} value={e.id}>{(e.sku?e.sku+" · ":"")+(e.name||"")}{sheetFor(s,e.id)?" ✓ started":""}</option>))}
          {rest.length>0&&<option value="" disabled>──── does not match {(bm.match||[]).join(", ")||"—"} ────</option>}
          {rest.map(e=>(<option key={e.id} value={e.id}>{(e.sku?e.sku+" · ":"")+(e.name||"")}{sheetFor(s,e.id)?" ✓ started":""}</option>))}
        </select>
        <span style={{fontSize:12,color:"var(--mt)"}}>Opens its passport on the BOM tab. The parts order is ready straight away; the decision sheet gets worked through teardown.</span>
      </div>);})()}
    {(()=>{const fits=(s.inventory||[]).filter(i=>isEngine(i)&&bomFits(bm,i));const toks=(bm.match||[]);
      return(<div className="rc-card" style={{padding:12,marginBottom:16}}><div className="rc-fl" style={{marginBottom:6}}>Matches {toks.length?toks.join(", "):"every engine"}</div>
      {fits.length===0?(<div style={{fontSize:13,color:"var(--r)",lineHeight:1.5}}>Nothing on the lot matches this. The tokens are compared against the engine's name — check how the engines are actually named and widen the token in Details.</div>):(<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{fits.map(e=>(<button key={e.id} className="rc-fb" onClick={()=>d({type:"MODAL",v:"part-detail",d:{...e,ptab:"bom"}})}>{e.name||e.sku}</button>))}</div>)}</div>);})()}
    <div className="rc-g4">
      <Stat label="Lines" value={ls.length}/>
      <Stat label="Parts Order" value={nO} sub="always new, ordered day one"/>
      <Stat label="Decision Sheet" value={ls.length-nO} sub="blank means replace"/>
      <Stat label="Rev" value={bm.rev||"1.0"}/>
    </div>
    {bm.watch&&<div className="rc-card" style={{padding:12,marginBottom:16,fontSize:13,color:"var(--w)",lineHeight:1.55}}>⚠ {bm.watch}</div>}
    {secs.map(sec=>{const sl=ls.filter(l=>l.sec===sec);const k0=sl.length&&lineKind(sl[0])==="order"?"order":"decide";return(<div key={sec} style={{marginBottom:16}}>
      <SH title={sec}><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-bomline",d:{bomId:bm.id,sec,kind:k0}})}>+ Line</button></SH>
      <Tbl headers={["Qty","Part","Page",k0==="order"?"Note":"What to check",""]}>{sl.map(l=>(<tr key={l.id}>
        <td style={{color:"var(--mt)",width:48}}>{l.qty}</td>
        <td className="rc-tn">{l.part}{l.mach?<span style={{color:"var(--b)",fontSize:11,marginLeft:6}}>MACH</span>:null}</td>
        <td>{lineKind(l)==="order"?<span style={{color:"var(--act)",fontSize:12}}>order · always new</span>:<span style={{color:"var(--w)",fontSize:12}}>decide</span>}</td>
        <td style={{color:"var(--tx2)",fontSize:12}}>{l.note||""}</td>
        <td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-bomline",d:{...l,bomId:bm.id}})}>✎</button><button className="rc-bs rc-bsr" onClick={()=>setLines(bm,ls.filter(x=>x.id!==l.id))}>×</button></BtnRow></td>
      </tr>))}</Tbl>
    </div>);})}
    {bm.rule&&<div className="rc-card" style={{padding:12,fontSize:13,color:"var(--tx2)",lineHeight:1.6}}>{bm.rule}</div>}
  </>);
}
function Services({s,d}){
  const cur=(s.settings||[])[0];const[rate,setRate]=useState(String((cur&&cur.shopRate)||""));const[q,setQ]=useState("");
  const list=s.services||[];const st=svcStats(s);const sr=shopRate(s);
  const shown=list.filter(x=>!q||(x.name+" "+(x.cat||"")+" "+(x.desc||"")).toLowerCase().includes(q.toLowerCase()));
  const priced=list.filter(x=>x.pricing==="hourly"?sr>0:+x.price>0).length;
  const T=Object.values(st).reduce((a,v)=>({n:a.n+v.n,charged:a.charged+v.charged,cost:a.cost+v.cost}),{n:0,charged:0,cost:0});
  const saveRate=()=>{const v=+rate||0;if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:{shopRate:v}});else d({type:"ADD",list:"settings",d:{shopRate:v},label:"Shop rate saved"});d({type:"TOAST",d:{msg:"Shop rate saved · "+$$(v)+"/hr",t:Date.now()}});};
  return(<div>
    <div className="rc-g4">
      <Stat label="Services offered" value={list.filter(x=>x.active!==false).length} sub={priced+" of "+list.length+" have a price"}/>
      <Stat label="Jobs done" value={T.n} sub="work orders and invoiced services"/>
      <Stat label="Charged for services" value={$K(T.charged)}/>
      <Stat label="Labour profit" value={$K(T.charged-T.cost)} sub={T.charged>0?Math.round((T.charged-T.cost)/T.charged*100)+"% after tech pay":"no jobs yet"}/>
    </div>
    <div className="rc-card" style={{padding:16,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:230}}><div style={{fontWeight:700,fontSize:15.5}}>Shop labour rate</div><div style={{fontSize:13,color:"var(--mt)",marginTop:2,lineHeight:1.5}}>What you charge per hour for hourly work. It's separate from what techs are paid — their pay rate is what logged hours cost you.</div></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:15,color:"var(--mt)"}}>$</span><input className="rc-fi" id="shop-rate" type="number" aria-label="Shop labour rate, dollars per hour" value={rate} onChange={e=>setRate(e.target.value)} style={{width:120}}/><span style={{fontSize:14,color:"var(--mt)"}}>/hr</span><button className="rc-ba" onClick={saveRate}>Save</button></div>
      {!sr&&<div style={{width:"100%",fontSize:13,color:"var(--w)"}}>Not set yet. Hourly services show $0 until it is.</div>}
    </div>
    <SH title="Price List"><input className="rc-si" placeholder="Search services…" aria-label="Search services" value={q} onChange={e=>setQ(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-svc"})}>+ Service</button></SH>
    {list.length===0?(<Empty icon="🏷" title="No Services" sub="Add what you do and what you charge for it" action={()=>d({type:"MODAL",v:"add-svc"})} label="+ Service"/>):shown.length===0?(<div className="rc-card" style={{padding:16,fontSize:14,color:"var(--mt)"}}>No service matches “{q}”.</div>):(
      <Tbl fit headers={["Service","Price",{h:"Done",cls:"rc-sm-hide"},{h:"Charged",cls:"rc-sm-hide"},{h:"Labour profit",cls:"rc-sm-hide"},""]}>{svcCats(shown).map(c=>[<tr key={"c:"+c} className="rc-grp"><td colSpan={6}>{c}</td></tr>,...shown.filter(x=>(x.cat||"Other")===c).map(x=>{const v=st[String(x.id)]||{n:0,charged:0,cost:0};const off=x.active===false;return(<tr key={x.id} style={{opacity:off?.55:1}}>
        <td><div className="rc-tn">{x.name}{truthy(x.withEngine)&&<span title="Offered in the Sell Engine form" style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--act)",marginLeft:7}}>WITH ENGINES</span>}{off&&<span style={{fontSize:11,fontWeight:600,color:"var(--mt)",marginLeft:7}}>HIDDEN</span>}</div>{x.desc&&<div style={{fontSize:12.5,color:"var(--mt)",marginTop:2,maxWidth:480,lineHeight:1.45}}>{x.desc}</div>}{v.n>0&&<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--tx2)",marginTop:4}}>{v.n} done · {$$(v.charged)} charged</div>}</td>
        <td style={{whiteSpace:"nowrap"}}>{x.pricing==="hourly"?(<span>{sr?$$(sr)+"/hr":<span style={{color:"var(--w)"}}>hourly · no rate</span>}{+x.hours?<div style={{fontSize:12,color:"var(--mt)"}}>about {x.hours}h</div>:null}</span>):(+x.price?<b>{$$(+x.price)}</b>:<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-svc",d:x})} style={{color:"var(--w)",borderColor:tint("var(--w)",45)}}>Set price</button>)}</td>
        <td className="rc-sm-hide">{v.n||"—"}</td><td className="rc-sm-hide" style={{fontWeight:600}}>{v.n?$$(v.charged):"—"}</td><td className="rc-sm-hide" style={{color:!v.n?"var(--mt)":v.charged-v.cost<0?"var(--r)":"var(--g)"}}>{v.n?$$(v.charged-v.cost):"—"}</td>
        <td><BtnRow><button className="rc-bs" aria-label={"Edit "+x.name} onClick={()=>d({type:"MODAL",v:"edit-svc",d:x})}>✎</button><button className="rc-bs rc-bsr" aria-label={"Delete "+x.name} onClick={()=>d({type:"DELETE",list:"services",id:x.id})}>×</button></BtnRow></td>
      </tr>);})])}</Tbl>)}
    {st.other&&st.other.n?<p style={{fontSize:13,color:"var(--mt)"}}>Plus {st.other.n} work order{st.other.n===1?"":"s"} with no price-list service picked, charged {$$(st.other.charged)}.</p>:null}
    <p style={{fontSize:13,color:"var(--mt)",lineHeight:1.55,maxWidth:760,marginTop:10}}>This started as a typical list for an engine sales and heavy-duty service shop. Delete what you don't do, add what's missing, and set your prices. Services marked WITH ENGINES show up in the Sell Engine form.</p>
  </div>);
}
function Issues({s,d}){
  const[view,setView]=useState("issues");const[mode,setMode]=useState("model");const[q,sq]=useState("");const[fm,sfm]=useState("all");const[fs,sfs]=useState("all");const[fo,sfo]=useState("all");
  const list=s.issues||[];const dxs=(s.diagnoses||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id);
  const engs=(s.inventory||[]).filter(isEngine);
  const lotFams=[...new Set(engs.map(familyKey))].filter(k=>k&&k!=="?");
  const fams=[...new Set([...lotFams,...list.flatMap(is=>(is.models||[]).map(normM))])].filter(Boolean).sort((a,b)=>(lotFams.includes(b)-lotFams.includes(a))||a.localeCompare(b));
  const t=(q||"").toLowerCase();
  const matchQ=is=>!t||[is.title,is.causes,is.confirm,is.fix,is.parts,is.notes,(is.models||[]).join(" "),(is.symptoms||[]).join(" ")].some(v=>(v||"").toLowerCase().includes(t));
  const matchM=is=>{if(fm==="all")return true;const ms=(is.models||[]).map(normM);if(!ms.length)return true;return ms.some(m=>fm.includes(m)||m.includes(fm));};
  const matchS=is=>fs==="all"||(is.symptoms||[]).includes(fs);
  const sevRank={high:0,medium:1,low:2};
  const fl=list.filter(matchQ).filter(matchM).filter(matchS).sort((a,b)=>(sevRank[a.severity]??1)-(sevRank[b.severity]??1)||(a.title||"").localeCompare(b.title||""));
  const seen=is=>dxs.filter(x=>+x.issueId===is.id).length;
  const onLot=is=>engs.filter(e=>engStatus(e)!=="sold"&&issueFits(is,e)).length;
  const open=dxs.filter(x=>(x.outcome||"open")!=="resolved").length;
  const dxl=dxs.filter(x=>fo==="all"||(x.outcome||"open")===fo).filter(x=>{if(!t)return true;const e=engById(s,x.engineId);return [x.findings,x.fix,x.codes,x.notes,x.tech,(x.symptoms||[]).join(" "),e&&e.name,e&&e.sku].some(v=>(v||"").toLowerCase().includes(t));});
  return (<div>
    <div className="rc-g4"><Stat label="Known Issues" value={list.length} sub={list.filter(is=>is.source==="shop").length+" from this shop"}/><Stat label="Families Covered" value={fams.length} sub={lotFams.length+" on the lot"}/><Stat label="Diagnoses Logged" value={dxs.length}/><Stat label="Open" value={open} sub={open>0?"unresolved":"all resolved"} dir={open>0?"down":"up"}/></div>
    <SH title={view==="issues"?"Common Issues":"Diagnosis Log"}><button className="rc-fb" onClick={()=>setView(view==="issues"?"log":"issues")}>{view==="issues"?"🩺 Diagnosis Log":"📚 Common Issues"}</button><input className="rc-si" placeholder={view==="issues"?"Search issues, models, parts...":"Search findings, engine, tech..."} value={q} onChange={e=>sq(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-dx",d:{prefill:{date:isoToday()}}})}>🩺 + Diagnosis</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-issue"})}>+ Issue</button></SH>
    {view==="issues"?(<>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}><span style={{fontSize:11,color:"var(--mt)",letterSpacing:1,textTransform:"uppercase"}}>Browse by</span><button className={"rc-fb"+(mode==="model"?" on":"")} onClick={()=>{setMode("model");sfs("all");}}>Engine model</button><button className={"rc-fb"+(mode==="symptom"?" on":"")} onClick={()=>{setMode("symptom");sfm("all");}}>Symptom</button></div>
      {mode==="model"?<Fil opts={[["all","All"],...fams.map(k=>[k,famLabel(k)+(lotFams.includes(k)?" ·":"")])]} active={fm} set={sfm}/>:<Fil opts={[["all","All"],...SYMPTOMS.map(x=>[x,x])]} active={fs} set={sfs}/>}
      {fl.length===0?(<Empty icon="📚" title="No Issues" sub="Nothing matches — add what you've learned on the floor" action={()=>d({type:"MODAL",v:"add-issue"})} label="+ Add Issue"/>):(<Tbl fit headers={["Sev","Issue",{h:"Models",cls:"rc-sm-hide"},{h:"Symptoms",cls:"rc-sm-hide"},{h:"On lot",cls:"rc-sm-hide"},{h:"Seen",cls:"rc-sm-hide"},""]}>{fl.map(is=>(<tr key={is.id}><td><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:sevCol(is.severity),boxShadow:"0 0 6px "+sevCol(is.severity)}} title={is.severity}/></td><td onClick={()=>d({type:"MODAL",v:"issue-detail",d:is})} style={{cursor:"pointer",maxWidth:340}}><div className="rc-tn">{is.title}</div>{is.causes&&<div className="rc-clip" style={{fontSize:12,color:"var(--mt)"}}>{is.causes}</div>}<div className="rc-sm-only" style={{fontSize:12.5,color:"var(--act)",marginTop:3}}>{(is.models||[]).length?is.models.map(famLabel).join(", "):"all engines"}{onLot(is)>0?<span style={{color:"var(--w)"}}>{" · "+onLot(is)+" on the lot"}</span>:null}</div></td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--act)"}}>{(is.models||[]).length?is.models.map(famLabel).join(", "):<span style={{color:"var(--mt)"}}>all</span>}</td><td className="rc-sm-hide"><div style={{display:"flex",gap:3,flexWrap:"wrap",maxWidth:220}}>{(is.symptoms||[]).slice(0,4).map(x=>(<span key={x} style={{fontSize:12,fontFamily:"var(--fb)",color:"var(--tx2)",border:"1px solid var(--ln)",borderRadius:2,padding:"0 4px"}}>{x}</span>))}{(is.symptoms||[]).length>4&&<span style={{fontSize:12,color:"var(--mt)"}}>+{is.symptoms.length-4}</span>}</div></td><td className="rc-sm-hide" style={{fontSize:13,color:onLot(is)>0?"var(--w)":"var(--mt)"}}>{onLot(is)||"—"}</td><td className="rc-sm-hide" style={{fontSize:13,color:seen(is)>0?"var(--g)":"var(--mt)"}}>{seen(is)||"—"}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-issue",d:is})} aria-label={"Edit "+recName(is)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"issues",id:is.id})} aria-label={"Delete "+recName(is)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </>):(<>
      <Fil opts={[["all","All"],...DX_OUTCOMES]} active={fo} set={sfo}/>
      {dxl.length===0?(<Empty icon="🩺" title="No Diagnoses" sub="Log what you find on an engine — from its passport or right here" action={()=>d({type:"MODAL",v:"add-dx",d:{prefill:{date:isoToday()}}})} label="+ Log Diagnosis"/>):(<Tbl headers={["Date","Engine","Symptoms","Findings → Fix","Tech","Cost","Outcome",""]}>{dxl.map(x=>{const e=engById(s,x.engineId);const c=(+x.hours||0)*(+x.rate||0)+(x.parts||[]).reduce((a,p)=>a+(+p.v||0),0);return(<tr key={x.id}><td style={{fontSize:13,color:"var(--tx2)",whiteSpace:"nowrap"}}>{x.date}</td><td onClick={()=>e&&d({type:"MODAL",v:"part-detail",d:{...e,ptab:"diagnosis"}})} style={{cursor:e?"pointer":"default"}}><div className="rc-tn">{e?e.name:"—"}</div>{e&&<div style={{fontSize:11,color:"var(--mt)"}}>{e.sku}</div>}</td><td style={{fontSize:13}}>{(x.symptoms||[]).join(", ")||"—"}</td><td onClick={()=>d({type:"MODAL",v:"dx-detail",d:x})} style={{cursor:"pointer",fontSize:13,maxWidth:300}}><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>{x.findings||"—"}</div>{x.fix&&<div style={{color:"var(--g)",fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>→ {x.fix}</div>}</td><td style={{fontSize:13,color:"var(--act)"}}>{x.tech||"—"}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{c>0?$$(c):"—"}</td><td><Badge s={x.outcome||"open"}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-dx",d:x})} aria-label={"Edit "+recName(x)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"diagnoses",id:x.id})} aria-label={"Delete "+recName(x)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>);})}</Tbl>)}
    </>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// ECM — programming / calibration / tuning jobs
// ═══════════════════════════════════════════════════════════════
function Ecm({s,d}){
  const[fs,sfs]=useState("all");const[ft,sft]=useState("");const[ff,sff]=useState("");const[fc,sfc]=useState("");const[q,sq]=useState("");
  const all=(s.ecmJobs||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id);
  const t=q.trim().toLowerCase();
  const list=all.filter(j=>fs==="all"||(fs==="open"?j.status!=="complete":(j.status||"intake")===fs)).filter(j=>!ft||(j.types||[]).includes(ft)).filter(j=>!ff||j.family===ff).filter(j=>!fc||+j.custId===+fc).filter(j=>!t||[j.unit,j.vin,j.esn,j.make,j.model,j.custId?cn(s.customers,+j.custId):"",j.family?ecmFamLabel(j.family):""].some(v=>String(v||"").toLowerCase().includes(t)));
  const open=all.filter(j=>j.status!=="complete").length;const held=all.filter(j=>j.status==="on-hold"&&j.holdReason==="emissions").length;const done=all.filter(j=>j.status==="complete").length;
  const rev=all.filter(j=>j.status==="complete"||ecmInv(s,j)).reduce((a,j)=>a+ecmCharge(s,j),0);
  const fams=[...new Set(all.map(j=>j.family).filter(Boolean))].sort();const custs=[...new Set(all.map(j=>+j.custId).filter(Boolean))];
  const files=s.ecmFiles||[];const used=files.reduce((a,x)=>a+(+x.size||0),0);const ids=new Set(all.map(j=>j.id));const orphan=files.filter(x=>!ids.has(+x.jobId));const orphanB=orphan.reduce((a,x)=>a+(+x.size||0),0);
  // Files stay in storage when their job is deleted, so the delete can be undone. This clears them out for good.
  const cleanup=()=>{removeEcmFiles(orphan.map(x=>x.path));orphan.forEach(x=>d({type:"DELETE",list:"ecmFiles",id:x.id}));d({type:"TOAST",d:{msg:"Removed "+orphan.length+" file"+(orphan.length===1?"":"s")+" left from deleted jobs",t:Date.now()}});};
  const fu=j=>{const n=ecmNextFu(s,j);if(!n)return j.status==="complete"?<span style={{color:"var(--g)",fontSize:13}}>✓ all recorded</span>:<span style={{color:"var(--mt)"}}>—</span>;const late=n.date<isoToday();return(<div style={{fontSize:13,color:late?"var(--w)":"var(--tx2)",whiteSpace:"nowrap"}}>{n.n} days{late?" · overdue":""}<div style={{fontSize:12,color:late?"var(--w)":"var(--mt)"}}>{n.date}</div></div>);};
  const sel={width:"auto",minWidth:170,appearance:"none"};
  return(<div>
    <div className="rc-g4"><Stat label="Open ECM jobs" value={open}/><Stat label="On hold: emissions" value={held} sub={held?"waiting on EGR / DPF / SCR repairs":"none"} dir={held?"down":undefined}/><Stat label="Completed" value={done}/><Stat label="ECM revenue" value={$K(rev)} sub="completed or billed jobs"/></div>
    <SH title="ECM Jobs"><input className="rc-si" placeholder="Search unit, VIN, ESN, customer…" aria-label="Search ECM jobs" value={q} onChange={e=>sq(e.target.value)}/><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"ecm-prices"})}>Price list</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-ecm",d:{prefill:{date:isoToday()}}})}>+ ECM Job</button></SH>
    <Fil opts={[["all","All"],["open","Open"],...ECM_ST,["on-hold","On hold"]]} active={fs} set={sfs}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"-4px 0 14px"}}>
      <select className="rc-fi" aria-label="Filter by job type" value={ft} onChange={e=>sft(e.target.value)} style={sel}><option value="">Every job type</option>{ECM_TYPES.map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</select>
      <select className="rc-fi" aria-label="Filter by engine family" value={ff} onChange={e=>sff(e.target.value)} style={sel}><option value="">Every engine family</option>{fams.map(k=>(<option key={k} value={k}>{ecmFamLabel(k)}</option>))}</select>
      <select className="rc-fi" aria-label="Filter by customer" value={fc} onChange={e=>sfc(e.target.value)} style={sel}><option value="">Every customer</option>{custs.map(c=>(<option key={c} value={c}>{cn(s.customers,c)}</option>))}</select>
    </div>
    {list.length===0?(<Empty icon="🖥" title={all.length?"No Matching Jobs":"No ECM Jobs"} sub={all.length?"Nothing matches these filters":"Open one when a truck comes in for programming, a calibration update or ECM setup"} action={()=>d({type:"MODAL",v:"add-ecm",d:{prefill:{date:isoToday()}}})} label="+ ECM Job"/>):(<Tbl headers={["Date","Customer / truck","Engine","Work","Status","Charge","Next follow-up",""]}>{list.map(j=>(<tr key={j.id} style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"ecm-job",d:{id:j.id}})}>
      <td style={{fontSize:13,color:"var(--tx2)",whiteSpace:"nowrap"}}>{j.date}</td>
      <td><div className="rc-tn">{ecmCust(s,j)}</div><div style={{fontSize:12.5,color:"var(--mt)"}}>{[j.unit&&"Unit "+j.unit,[j.year,j.make,j.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ")||"—"}</div></td>
      <td style={{fontSize:13.5}}>{j.family?ecmFamLabel(j.family):<span style={{color:"var(--mt)"}}>not set</span>}{j.esn&&<div style={{fontSize:12,color:"var(--mt)"}}>ESN {j.esn}</div>}</td>
      <td style={{fontSize:13,maxWidth:250}}>{(j.types||[]).map(ecmTypeLabel).join(", ")||<span style={{color:"var(--mt)"}}>not set</span>}</td>
      <td><Badge s={j.status||"intake"}/>{j.status==="on-hold"&&j.holdReason==="emissions"&&<div style={{fontSize:11.5,color:"var(--r)",marginTop:3,fontWeight:700,letterSpacing:.5}}>EMISSIONS</div>}</td>
      <td style={{fontWeight:600,whiteSpace:"nowrap"}}>{j.billTo==="warranty"?<span style={{color:"var(--mt)",fontWeight:400}}>warranty</span>:$$(ecmCharge(s,j))}{ecmInv(s,j)&&<div style={{fontSize:11.5,color:"var(--g)",fontWeight:500}}>billed</div>}</td>
      <td>{fu(j)}</td>
      <td onClick={e=>e.stopPropagation()}><button className="rc-bs rc-bsr" aria-label="Delete ECM job" onClick={()=>d({type:"DELETE",list:"ecmJobs",id:j.id})} style={{fontSize:14.5}}>×</button></td>
    </tr>))}</Tbl>)}
    <div className="rc-card" style={{padding:14,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:230}}><div style={{fontWeight:700,fontSize:14.5}}>Data logs and reports</div><div style={{fontSize:13,color:"var(--mt)",marginTop:2,lineHeight:1.5}}>{files.length} file{files.length===1?"":"s"} · {fmtBytes(used)} of the {fmtBytes(ECM_FREE_BYTES)} free-plan storage, shared with engine photos · 10 MB max per file</div></div>
      <div style={{width:180,height:8,background:"var(--sf2)",border:"1px solid var(--ln)",borderRadius:6,overflow:"hidden"}} role="img" aria-label={"Storage used: "+fmtBytes(used)}><div style={{width:Math.min(100,used/ECM_FREE_BYTES*100)+"%",height:"100%",background:"var(--ac)"}}/></div>
      {orphan.length>0&&<button className="rc-bs" onClick={cleanup}>Remove {orphan.length} file{orphan.length===1?"":"s"} from deleted jobs · {fmtBytes(orphanB)}</button>}
    </div>
    <p style={{fontSize:13,color:"var(--mt)",lineHeight:1.55,maxWidth:780,marginTop:2}}>For parameter programming, factory calibration updates, ECM setup, injector trim codes and emissions-intact tunes. Every job checks EGR, DPF and SCR at intake and at release, and a failed check puts it on hold until the system is repaired.</p>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// PROSPECTS — trucking fleets to cold-approach
// ═══════════════════════════════════════════════════════════════
function Prospects({s,d}){
  const[q,sq]=useState("");const[fp,sfp]=useState("all");const[fr,sfr]=useState("");const[ft,sft]=useState("");const[fh,sfh]=useState("");const[fs,sfs]=useState("all");const[due,sdue]=useState(false);const[lim,setLim]=useState(100);
  const all=s.prospects||[];const td=isoToday();
  const cnt=k=>all.filter(r=>(r.status||"")===k).length;const dueN=all.filter(r=>fuDue(r,td)).length;
  const regions=[...new Set(all.map(r=>r.region).filter(Boolean))].sort();const types=[...new Set(all.map(r=>r.fleetType).filter(Boolean))].sort();const hauls=[...new Set(all.map(r=>haulGroup(r.haul)))].sort();
  const t=q.trim().toLowerCase();const dg=t.replace(/\D/g,"");
  const list=all.filter(r=>(fp==="all"||r.priority===fp)&&(!fr||r.region===fr)&&(!ft||r.fleetType===ft)&&(!fh||haulGroup(r.haul)===fh)&&(fs==="all"||(r.status||"")===fs)&&(!due||fuDue(r,td))&&(!t||[r.name,r.city,r.phone,r.contactName].some(v=>String(v||"").toLowerCase().includes(t))||(dg.length>=3&&String(r.phone||"").replace(/\D/g,"").includes(dg)))).sort((a,b)=>(+a.kmFromMH||0)-(+b.kmFromMH||0)||String(a.name||"").localeCompare(String(b.name||"")));
  const sel={width:"auto",minWidth:150,appearance:"none"};
  return(<div>
    <div className="rc-pipe" role="group" aria-label="Pipeline by status">{PST.map(([k,l,c])=>(<button key={k||"new"} type="button" className={"rc-pipe-i"+(fs===k?" on":"")} aria-pressed={fs===k} onClick={()=>sfs(fs===k?"all":k)} style={{"--pc":c}}><span className="n">{cnt(k)}</span><span className="l">{l}</span></button>))}</div>
    <SH title={"Fleet Prospects · "+all.length}><input className="rc-si" placeholder="Search name, city, phone…" aria-label="Search prospects" value={q} onChange={e=>sq(e.target.value)}/><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"route-day"})}>🗺 Route day</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"pros-add",d:{list:"prospects"}})}>+ Prospect</button></SH>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
      {[["all","Every priority"],["A","Priority A"],["B","Priority B"],["C","Priority C"]].map(([k,l])=>(<button key={k} className={"rc-fb"+(fp===k?" on":"")} onClick={()=>sfp(k)}>{l}</button>))}
      <button className={"rc-fb"+(due?" on":"")} aria-pressed={due} onClick={()=>sdue(!due)}>Follow-up due{dueN?" · "+dueN:""}</button>
      <select className="rc-fi" aria-label="Filter by region" value={fr} onChange={e=>sfr(e.target.value)} style={sel}><option value="">Every region</option>{regions.map(x=>(<option key={x} value={x}>{x}</option>))}</select>
      <select className="rc-fi" aria-label="Filter by fleet type" value={ft} onChange={e=>sft(e.target.value)} style={sel}><option value="">Every fleet type</option>{types.map(x=>(<option key={x} value={x}>{x}</option>))}</select>
      <select className="rc-fi" aria-label="Filter by haul type" value={fh} onChange={e=>sfh(e.target.value)} style={sel}><option value="">Every haul type</option>{hauls.map(x=>(<option key={x} value={x}>{x}</option>))}</select>
      <select className="rc-fi" aria-label="Filter by status" value={fs} onChange={e=>sfs(e.target.value)} style={sel}><option value="all">Every status</option>{PST.map(([k,l])=>(<option key={k||"new"} value={k}>{l}</option>))}</select>
    </div>
    {list.length===0?(<Empty icon="🎯" title={all.length?"No Matching Fleets":"No Prospects"} sub={all.length?"Nothing matches these filters":"Add the fleets you want to call on"} action={()=>d({type:"MODAL",v:"pros-add",d:{list:"prospects"}})} label="+ Prospect"/>):(<>
      <Tbl fit headers={["Pri","Fleet",{h:"Type",cls:"rc-sm-hide"},{h:"Status",cls:"rc-sm-hide"},{h:"Follow-up",cls:"rc-sm-hide"},{h:"Last contact",cls:"rc-sm-hide"},{h:"",cls:"rc-sm-hide"}]}>{list.slice(0,lim).map(r=>{const ll=lastTouch(r);const dn=r.status==="do-not-contact";const late=fuDue(r,td);return(<tr key={r.id} style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"pros-rec",d:{list:"prospects",id:r.id}})}>
        <td><span className={"rc-pri p"+(r.priority||"")}>{r.priority||"—"}</span></td>
        <td><div className="rc-tn">{r.name}</div><div style={{fontSize:12.5,color:"var(--mt)"}}>{[r.city,kmTxt(r)].filter(Boolean).join(" · ")}</div><div className="rc-sm-only" style={{marginTop:6}} onClick={e=>e.stopPropagation()}><div style={{marginBottom:6}}><PBadge st={r.status}/></div>{r.nextFollowUp&&<div style={{fontSize:12.5,marginBottom:6,color:late?"var(--w)":"var(--tx2)",fontWeight:late?600:400}}>Follow up {r.nextFollowUp}{late?" · due":""}</div>}<BtnRow nw>{nb(r.phone)&&<a className="rc-bs" href={telHref(r.phone)} aria-label={"Call "+r.name} style={{textDecoration:"none"}}>📞</a>}<button className="rc-bs" disabled={dn} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list:"prospects",id:r.id}})}>Log visit</button></BtnRow></div></td>
        <td className="rc-sm-hide" style={{fontSize:13,maxWidth:220}}>{r.fleetType}<div style={{fontSize:12,color:"var(--mt)"}}>{r.haul}</div></td>
        <td className="rc-sm-hide"><PBadge st={r.status}/></td>
        <td className="rc-sm-hide" style={{fontSize:13,whiteSpace:"nowrap",color:late?"var(--w)":"var(--tx2)",fontWeight:late?600:400}}>{r.nextFollowUp||"—"}{late?<div style={{fontSize:12}}>due</div>:null}</td>
        <td className="rc-sm-hide" style={{fontSize:13,color:"var(--tx2)",whiteSpace:"nowrap"}}>{r.lastContact||"—"}{ll&&ll.outcome?<div style={{fontSize:12,color:"var(--mt)",maxWidth:170,overflow:"hidden",textOverflow:"ellipsis"}}>{ll.outcome}</div>:null}</td>
        <td className="rc-sm-hide" onClick={e=>e.stopPropagation()}><BtnRow nw>{nb(r.phone)&&<a className="rc-bs" href={telHref(r.phone)} aria-label={"Call "+r.name} title={nb(r.phone)} style={{textDecoration:"none"}}>📞</a>}<button className="rc-bs" disabled={dn} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list:"prospects",id:r.id}})} style={{whiteSpace:"nowrap"}}>Log visit</button></BtnRow></td>
      </tr>);})}</Tbl>
      {list.length>lim&&<button className="rc-bs" onClick={()=>setLim(lim+100)}>Show {Math.min(100,list.length-lim)} more of {list.length-lim}</button>}
    </>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// COMPETITORS — who else does diesel / engine work, and which shops buy engines
// ═══════════════════════════════════════════════════════════════
const CMP_COLS=[["business","Business"],["city","City"],["kmFromMH","km"],["category","Category"],["hdFocus","HD focus"],["sellsRemanHD","Sells reman HD"],["stockOnHand","Stock on hand"],["postedPricing","Posted pricing"],["platforms","Platforms"],["machineShop","Machine shop"],["mobile","Mobile"],["shipsCanadaWide","Ships Canada-wide"],["rollinCoalWins","Where we win"],["theyWin","Where they win"]];
function ComparePanel({s,d}){
  const[ed,setEd]=useState(null);const[addId,setAddId]=useState("");
  const rows=(s.compare||[]).slice().sort((a,b)=>(b.us?1:0)-(a.us?1:0)||(+a.kmFromMH||0)-(+b.kmFromMH||0));
  const save=(r,k,v)=>{const val=k==="kmFromMH"?(String(v).trim()===""?"":+v||0):v;if(String(r[k]??"")!==String(val))d({type:"UPDATE",list:"compare",id:r.id,d:{[k]:val}});setEd(null);};
  const have=new Set((s.compare||[]).map(r=>String(r.business||"").toLowerCase()));
  const addShop=()=>{const c=resById(s,"competitors",addId);if(!c)return;d({type:"ADD",list:"compare",keep:true,d:{id:"cmp-"+Date.now(),business:c.name,city:c.city||"",kmFromMH:c.kmFromMH??"",category:c.category||"",hdFocus:/HD/.test(c.duty||"")?"Yes":(c.duty||""),sellsRemanHD:c.sellsEngines||"",stockOnHand:"",postedPricing:c.postedPricing||"",platforms:"",machineShop:"",mobile:c.mobile24hr||"",shipsCanadaWide:"",rollinCoalWins:"",theyWin:""},label:c.name+" added to the comparison"});setAddId("");};
  return(<div>
    <div style={{fontSize:13,color:"var(--mt)",margin:"0 0 10px",lineHeight:1.5}}>The cheat sheet for sales calls. Click any cell to change it. Rollin Coal stays pinned on top.</div>
    <div className="rc-card"><table className="rc-tbl rc-cmp"><thead><tr>{CMP_COLS.map(([k,l])=>(<th key={k} className={k==="business"?"stick":""}>{l}</th>))}<th/></tr></thead><tbody>{rows.map(r=>(<tr key={r.id} className={r.us?"us":""}>
      {CMP_COLS.map(([k])=>{const on=ed&&ed.id===r.id&&ed.k===k;const v=r[k]??"";return(<td key={k} className={[k==="business"?"stick":"",k==="rollinCoalWins"?"win":"",k==="theyWin"?"lose":"","ed"].filter(Boolean).join(" ")} onClick={()=>{if(!on)setEd({id:r.id,k});}}>{on?<textarea className="rc-fi" autoFocus defaultValue={String(v)} rows={Math.min(6,Math.max(2,Math.ceil(String(v).length/26)))} aria-label={"Edit "+k+" for "+r.business} onBlur={e=>{if(e.target.dataset.cancel){setEd(null);return;}save(r,k,e.target.value);}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.blur();}if(e.key==="Escape"){e.currentTarget.dataset.cancel="1";e.currentTarget.blur();}}}/>:(String(v)||<span style={{color:"var(--ft)"}}>—</span>)}</td>);})}
      <td>{!r.us&&<button className="rc-bs rc-bsr" aria-label={"Remove "+r.business+" from the comparison"} onClick={e=>{e.stopPropagation();d({type:"DELETE",list:"compare",id:r.id});}}>×</button>}</td>
    </tr>))}</tbody></table></div>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><select className="rc-fi" aria-label="Add a shop to the comparison" value={addId} onChange={e=>setAddId(e.target.value)} style={{width:"auto",minWidth:260,appearance:"none"}}><option value="">Add a shop to the comparison…</option>{(s.competitors||[]).filter(c=>!have.has(String(c.name||"").toLowerCase())).slice().sort((a,b)=>(+a.kmFromMH||0)-(+b.kmFromMH||0)).map(c=>(<option key={c.id} value={c.id}>{c.name} · {c.city}</option>))}</select><button className="rc-bs" disabled={!addId} onClick={addShop}>+ Add</button></div>
  </div>);
}
function Competitors({s,d}){
  const[view,setView]=useState("shops");const[quick,setQuick]=useState("all");const[q,sq]=useState("");const[fr,sfr]=useState("");const[fc,sfc]=useState("");const[fth,sfth]=useState("");const[fsp,sfsp]=useState("");const[fdu,sfdu]=useState("");const[fse,sfse]=useState("");const[lim,setLim]=useState(100);
  const all=s.competitors||[];const td=isoToday();
  const rival=r=>["High","Medium"].includes(r.threat);const sellTo=r=>["High","Medium"].includes(r.salesProspect);
  const uniq=k=>[...new Set(all.map(r=>r[k]).filter(Boolean))].sort();
  const t=q.trim().toLowerCase();
  const list=all.filter(r=>(quick==="all"||(quick==="rivals"?rival(r):sellTo(r)))&&(!fr||r.region===fr)&&(!fc||r.category===fc)&&(!fth||r.threat===fth)&&(!fsp||r.salesProspect===fsp)&&(!fdu||r.duty===fdu)&&(!fse||sellsGroup(r.sellsEngines)===fse)&&(!t||[r.name,r.city,r.phone,r.specialty,r.category,r.contactName].some(v=>String(v||"").toLowerCase().includes(t)))).sort((a,b)=>(+a.kmFromMH||0)-(+b.kmFromMH||0)||String(a.name||"").localeCompare(String(b.name||"")));
  const sel={width:"auto",minWidth:150,appearance:"none"};
  const S=(v,set,lab,opts)=>(<select className="rc-fi" aria-label={lab} value={v} onChange={e=>set(e.target.value)} style={sel}><option value="">{lab}</option>{opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}</select>);
  return(<div>
    <div className="rc-g4"><Stat label="Shops tracked" value={all.length} sub={uniq("region").length+" regions"}/><Stat label="Rivals" value={all.filter(rival).length} sub="threat high or medium"/><Stat label="Shops to sell to" value={all.filter(sellTo).length} sub="sales prospect high or medium"/><Stat label="Sell engines" value={all.filter(r=>sellsGroup(r.sellsEngines)==="yes").length} sub="known so far"/></div>
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}} role="tablist" aria-label="Competitor views"><button role="tab" aria-selected={view==="shops"} className={"rc-fb"+(view==="shops"?" on":"")} onClick={()=>setView("shops")}>Shops · {all.length}</button><button role="tab" aria-selected={view==="compare"} className={"rc-fb"+(view==="compare"?" on":"")} onClick={()=>setView("compare")}>Comparison · {(s.compare||[]).length}</button></div>
    {view==="compare"?<ComparePanel s={s} d={d}/>:(<>
      <SH title="Competitors"><input className="rc-si" placeholder="Search name, city, specialty…" aria-label="Search competitors" value={q} onChange={e=>sq(e.target.value)}/><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"pros-add",d:{list:"competitors"}})}>+ Shop</button></SH>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{[["all","All shops"],["rivals","Rivals"],["sell","Shops to sell to"]].map(([k,l])=>(<button key={k} className={"rc-fb"+(quick===k?" on":"")} aria-pressed={quick===k} onClick={()=>setQuick(k)}>{l}</button>))}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{S(fr,sfr,"Every region",uniq("region"))}{S(fc,sfc,"Every category",uniq("category"))}{S(fth,sfth,"Any threat",["High","Medium","Low"])}{S(fsp,sfsp,"Any sales prospect",["High","Medium","Low","Supplier?"])}{S(fdu,sfdu,"Any duty class",uniq("duty"))}{S(fse,sfse,"Sells engines?",[["yes","Sells engines: yes"],["no","Sells engines: no"],["unknown","Sells engines: unknown"]])}</div>
      {list.length===0?(<Empty icon="🏁" title={all.length?"No Matching Shops":"No Competitors"} sub={all.length?"Nothing matches these filters":"Add the shops you compete with or sell to"} action={()=>d({type:"MODAL",v:"pros-add",d:{list:"competitors"}})} label="+ Shop"/>):(<>
        <Tbl fit headers={["Shop",{h:"Category",cls:"rc-sm-hide"},{h:"Threat",cls:"rc-sm-hide"},{h:"Sales prospect",cls:"rc-sm-hide"},{h:"Sells engines",cls:"rc-sm-hide"},"Status",{h:"",cls:"rc-sm-hide"}]}>{list.slice(0,lim).map(r=>(<tr key={r.id} style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"pros-rec",d:{list:"competitors",id:r.id}})}>
          <td><div className="rc-tn">{r.name}</div><div style={{fontSize:12.5,color:"var(--mt)"}}>{[r.city,kmTxt(r)].filter(Boolean).join(" · ")}</div><div className="rc-sm-only" style={{marginTop:4}}>{r.category&&<div style={{fontSize:12.5,color:"var(--tx2)"}}>{r.category}</div>}<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:4,fontSize:12.5,color:"var(--mt)"}}><span>Threat</span><Lvl v={r.threat} cols={THREAT_COL}/><span>Prospect</span><Lvl v={r.salesProspect} cols={SALES_COL}/></div>{(nb(r.phone)||isSalesShop(r))&&<div style={{marginTop:6}} onClick={e=>e.stopPropagation()}><BtnRow nw>{nb(r.phone)&&<a className="rc-bs" href={telHref(r.phone)} aria-label={"Call "+r.name} style={{textDecoration:"none"}}>📞</a>}{isSalesShop(r)&&<button className="rc-bs" disabled={r.status==="do-not-contact"} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list:"competitors",id:r.id}})}>Log visit</button>}</BtnRow></div>}</div></td>
          <td className="rc-sm-hide" style={{fontSize:13,maxWidth:220}}>{r.category}<div style={{fontSize:12,color:"var(--mt)"}}>{r.duty}{r.specialty?" · "+r.specialty:""}</div></td>
          <td className="rc-sm-hide"><Lvl v={r.threat} cols={THREAT_COL}/></td>
          <td className="rc-sm-hide"><Lvl v={r.salesProspect} cols={SALES_COL}/></td>
          <td className="rc-sm-hide" style={{fontSize:13,maxWidth:170,color:sellsGroup(r.sellsEngines)==="yes"?"var(--tx)":"var(--mt)"}}>{r.sellsEngines||"—"}</td>
          <td><PBadge st={r.status}/>{fuDue(r,td)&&<div style={{fontSize:12,color:"var(--w)",fontWeight:600,marginTop:3}}>follow-up due</div>}</td>
          <td className="rc-sm-hide" onClick={e=>e.stopPropagation()}><BtnRow nw>{nb(r.phone)&&<a className="rc-bs" href={telHref(r.phone)} aria-label={"Call "+r.name} title={nb(r.phone)} style={{textDecoration:"none"}}>📞</a>}{isSalesShop(r)&&<button className="rc-bs" disabled={r.status==="do-not-contact"} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list:"competitors",id:r.id}})} style={{whiteSpace:"nowrap"}}>Log visit</button>}</BtnRow></td>
        </tr>))}</Tbl>
        {list.length>lim&&<button className="rc-bs" onClick={()=>setLim(lim+100)}>Show {Math.min(100,list.length-lim)} more of {list.length-lim}</button>}
      </>)}
    </>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// INVOICING with AR Aging
// ═══════════════════════════════════════════════════════════════
function Invoicing({s,d}){
  // An invoice is overdue once it's unpaid past its due date (or marked overdue); money owed is aged by days late.
  const[f,sf]=useState("all");const today=Tsh.shopToday();const st=inv=>Mny.invStatus(inv,today);
  const fl=(s.invoices||[]).filter(inv=>f==="all"||st(inv)===f);
  const tot=pred=>(s.invoices||[]).filter(pred).reduce((a,inv)=>a+invTot(inv),0);
  const ag=Mny.aging(s.invoices,today);
  const paid=inv=>d({type:"UPDATE",list:"invoices",id:inv.id,d:{status:"paid",paidDate:isoToday()}});
  return (<div>
    <div className="rc-g4"><Stat label="Paid" value={<span style={{color:"var(--g)"}}>{$K(tot(Mny.isPaid))}</span>}/><Stat label="Not due yet" value={<span style={{color:"var(--w)"}}>{$K(tot(i=>!Mny.isPaid(i)&&!Mny.isOverdue(i,today)))}</span>}/><Stat label="Overdue" value={<span style={{color:"var(--r)"}}>{$K(tot(i=>Mny.isOverdue(i,today)))}</span>}/><Stat label="Total Outstanding" value={$K(tot(i=>!Mny.isPaid(i)))}/></div>
    <SH title="Accounts Receivable"/>
    <div className="rc-card rc-aging">{Mny.AGING.map(([k,l],i)=>(<div key={k}><div className="rc-ml">{l}</div><div className="rc-aging-v" style={{color:i===0?"var(--g)":i===1?"var(--w)":"var(--r)"}}>{$$(ag[k].v)}</div><div style={{fontSize:12,color:"var(--mt)"}}>{ag[k].n} invoice{ag[k].n!==1?"s":""}</div></div>))}</div>
    <SH title="Invoices"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-inv"})}>+ Invoice</button></SH>
    <Fil opts={[["all","All"],["pending","Not due yet"],["overdue","Overdue"],["paid","Paid"]]} active={f} set={sf}/>
    {fl.length===0?(<Empty icon="📄" title="No Invoices" sub="Create invoices" action={()=>d({type:"MODAL",v:"add-inv"})} label="+ Invoice"/>):(<Tbl fit headers={[{h:"#",cls:"rc-sm-hide"},"Customer",{h:"Date",cls:"rc-sm-hide"},{h:"Due",cls:"rc-sm-hide"},"Total",{h:"Status",cls:"rc-sm-hide"},""]}>{fl.map(inv=>{const late=Mny.isOverdue(inv,today)?Mny.daysLate(inv,today):0;return(<tr key={inv.id}><td className="rc-sm-hide" style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--act)"}}>{inv.invNum||inv.id}</td><td className="rc-tn">{cn(s.customers,inv.custId)}<div className="rc-sm-only" style={{fontSize:12.5,color:late?"var(--r)":"var(--mt)",fontWeight:400}}>{(inv.invNum||inv.id)+" · "+(Mny.isPaid(inv)?(inv.paidDate?"paid "+inv.paidDate:"paid"):late?late+" day"+(late===1?"":"s")+" late":"due "+Mny.dueDateOf(inv))}</div><div className="rc-sm-only" style={{marginTop:4}}><Badge s={st(inv)}/></div></td><td className="rc-sm-hide" style={{fontSize:13,color:"var(--mt)"}}>{Mny.docDate(inv)}</td><td className="rc-sm-hide" style={{fontSize:13,color:late?"var(--r)":"var(--mt)"}}>{Mny.isPaid(inv)?(inv.paidDate?"Paid "+inv.paidDate:"Paid"):Mny.dueDateOf(inv)}{!Mny.isPaid(inv)&&<div style={{fontSize:12}}>{late?late+" day"+(late===1?"":"s")+" late":inv.due||""}</div>}</td><td style={{fontWeight:600}}>{$$(invTot(inv))}</td><td className="rc-sm-hide"><Badge s={st(inv)}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"inv-detail",d:inv})}>View</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-inv",d:inv})} aria-label={"Edit "+recName(inv)} title="Edit" style={{fontSize:14.5}}>✎</button>{!Mny.isPaid(inv)&&<button className="rc-bs rc-bsg" onClick={()=>paid(inv)}>Paid</button>}<button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"invoices",id:inv.id})} aria-label={"Delete "+recName(inv)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>);})}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// OPERATIONS — Cores, Shipping, POs, Warranties
// ═══════════════════════════════════════════════════════════════
function Operations({s,d}){
  const[tab,setTab]=useState("cores");
  return (<div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>{[["cores","Core Tracking"],["ship","Shipping"],["po","Purchase Orders"],["warranty","Warranties"]].map(([k,l])=>(<button key={k} className={"rc-fb"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>))}</div>

    {tab==="cores"&&(<div>
      <SH title="Core Returns"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-core"})}>+ Core</button></SH>
      <div className="rc-g4"><Stat label="Total Cores" value={(s.cores||[]).length}/><Stat label="Pending" value={(s.cores||[]).filter(c=>c.status==="pending").length}/><Stat label="Received" value={(s.cores||[]).filter(c=>c.status==="received"||c.status==="accepted").length}/><Stat label="Total Deposits" value={$$((s.cores||[]).reduce((a,c)=>a+(c.deposit||0),0))}/></div>
      {(s.cores||[]).length===0?(<Empty icon="🔄" title="No Core Tracking" sub="Track engine core returns" action={()=>d({type:"MODAL",v:"add-core"})} label="+ Add Core"/>):(<Tbl headers={["Engine","Customer","Deposit","Due Date","Status",""]}>{(s.cores||[]).map(c=>(<tr key={c.id}><td className="rc-tn">{c.engineName}</td><td style={{fontSize:13}}>{cn(s.customers,c.custId)}</td><td style={{fontWeight:600,color:"var(--act)"}}>{$$(c.deposit||0)}</td><td style={{fontSize:13,color:c.status==="pending"?"var(--w)":"var(--mt)"}}>{c.dueDate||"—"}</td><td><Badge s={c.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-core",d:c})} aria-label={"Edit "+recName(c)} title="Edit" style={{fontSize:14.5}}>✎</button><select className="rc-fi" value={c.status} onChange={e=>d({type:"UPDATE",list:"cores",id:c.id,d:{status:e.target.value}})} style={{width:100,padding:"3px 6px",fontSize:12}}>{["pending","received","inspected","accepted","rejected","credited"].map(st=>(<option key={st} value={st}>{st}</option>))}</select><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"cores",id:c.id})} aria-label={"Delete "+recName(c)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </div>)}

    {tab==="ship"&&(<div>
      <SH title="Shipments"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-ship"})}>+ Shipment</button></SH>
      {(s.shipments||[]).length===0?(<Empty icon="🚚" title="No Shipments" sub="Track engine shipments" action={()=>d({type:"MODAL",v:"add-ship"})} label="+ Add"/>):(<Tbl headers={["Customer","Carrier","Tracking","Freight","Ship Date","Status",""]}>{(s.shipments||[]).map(sh=>(<tr key={sh.id}><td className="rc-tn">{cn(s.customers,sh.custId)}</td><td style={{fontSize:13}}>{sh.carrier}</td><td style={{fontSize:13,color:"var(--b)"}}>{sh.tracking||"—"}</td><td style={{fontWeight:600}}>{$$(sh.freightCost||0)}</td><td style={{fontSize:13,color:"var(--mt)"}}>{sh.shipDate}</td><td><Badge s={sh.deliveryConfirmed?"delivered":"in-transit"}/></td><td><BtnRow>{!sh.deliveryConfirmed&&<button className="rc-bs rc-bsg" onClick={()=>d({type:"UPDATE",list:"shipments",id:sh.id,d:{deliveryConfirmed:true}})}>✓ Delivered</button>}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-ship",d:sh})} aria-label={"Edit "+recName(sh)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"shipments",id:sh.id})} aria-label={"Delete "+recName(sh)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </div>)}

    {tab==="po"&&(<div>
      <SH title="Purchase Orders"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-po"})}>+ PO</button></SH>
      {(s.purchaseOrders||[]).length===0?(<Empty icon="📦" title="No POs" sub="Track parts orders" action={()=>d({type:"MODAL",v:"add-po"})} label="+ Add"/>):(<Tbl headers={["Vendor","Order Date","ETA","Total","Status",""]}>{(s.purchaseOrders||[]).map(po=>(<tr key={po.id}><td className="rc-tn">{po.vendor}</td><td style={{fontSize:13}}>{po.orderDate}</td><td style={{fontSize:13,color:"var(--mt)"}}>{po.eta||"—"}</td><td style={{fontWeight:600}}>{$$((po.items||[]).reduce((a,i)=>a+(i.q||0)*(i.r||0),0))}</td><td><Badge s={po.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-po",d:po})} aria-label={"Edit "+recName(po)} title="Edit" style={{fontSize:14.5}}>✎</button><select className="rc-fi" value={po.status} onChange={e=>d({type:"UPDATE",list:"purchaseOrders",id:po.id,d:{status:e.target.value}})} style={{width:90,padding:"3px 6px",fontSize:12}}>{["ordered","shipped","received"].map(st=>(<option key={st} value={st}>{st}</option>))}</select><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"purchaseOrders",id:po.id})} aria-label={"Delete "+recName(po)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </div>)}

    {tab==="warranty"&&(<div>
      <SH title="Warranties"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-warranty"})}>+ Warranty</button></SH>
      {(s.warranties||[]).length===0?(<Empty icon="🛡" title="No Warranties" sub="Track engine warranties" action={()=>d({type:"MODAL",v:"add-warranty"})} label="+ Add"/>):(<Tbl headers={["Engine","Customer","Period","Start","Expiry","Status",""]}>{(s.warranties||[]).map(w=>(<tr key={w.id}><td className="rc-tn">{w.engineName}</td><td style={{fontSize:13}}>{cn(s.customers,w.custId)}</td><td style={{fontSize:13}}>{w.warrantyPeriod}</td><td style={{fontSize:13,color:"var(--mt)"}}>{w.startDate}</td><td style={{fontSize:13,color:w.status==="expired"?"var(--r)":"var(--mt)"}}>{w.expiryDate}</td><td><Badge s={w.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-warranty",d:w})} aria-label={"Edit "+recName(w)} title="Edit" style={{fontSize:14.5}}>✎</button><select className="rc-fi" value={w.status} onChange={e=>d({type:"UPDATE",list:"warranties",id:w.id,d:{status:e.target.value}})} style={{width:90,padding:"3px 6px",fontSize:12}}>{["active","expired","claimed"].map(st=>(<option key={st} value={st}>{st}</option>))}</select><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"warranties",id:w.id})} aria-label={"Delete "+recName(w)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    </div>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MARKETING (compact — same structure as v2)
// ═══════════════════════════════════════════════════════════════
function Marketing({s,d}){
  const[lf,slf]=useState("all");const fL=(s.leads||[]).filter(l=>lf==="all"||l.status===lf);
  const[selId,setSelId]=useState("");const[gen,setGen]=useState(false);const[res,setRes]=useState(null);const[cp,setCp]=useState("");
  const availEngs=(s.inventory||[]).filter(i=>isEngine(i)&&engStatus(i)!=="sold");
  const selEng=(s.inventory||[]).find(i=>i.id===+selId);
  const parseV=(txt,tag,next)=>{const m="==="+tag+"===";const a=txt.indexOf(m);if(a<0)return txt;const st=a+m.length;const e=next?txt.indexOf("==="+next+"===",st):txt.length;return txt.slice(st,e<0?txt.length:e).trim();};
  const launch=async()=>{if(!selEng)return;setGen(true);setRes(null);const r=await askClaude(`Write engine sale listings for Rollin Coal (Medicine Hat AB, diesel engine specialists, ships Canada-wide, call 587-863-0505). Engine: ${selEng.name}, SKU ${selEng.sku}, condition ${selEng.condition||"used"}, price $${selEng.price} CAD, ESN ${selEng.serial||selEng.esn||"N/A"}${selEng.arrangement?", "+selEng.arrangement:""}${selEng.ratedHp?", "+selEng.ratedHp+" hp":""}. Output EXACTLY three sections with these literal separators and NOTHING else:\n===FACEBOOK===\n(casual punchy Facebook Marketplace post, a few emojis, 3-4 spec bullets, "Ships Canada-wide", phone, 4-5 hashtags)\n===KIJIJI===\n(structured Kijiji ad: title line, spec list, condition, price, shipping line, contact. No hashtags, no emojis)\n===MARKETBOOK===\n(professional dealer equipment listing: formal tone, full specs, stock number ${selEng.sku}, condition, price, dealer contact. No emojis or hashtags)\nPlain text only.`);setGen(false);setRes({facebook:parseV(r,"FACEBOOK","KIJIJI"),kijiji:parseV(r,"KIJIJI","MARKETBOOK"),marketbook:parseV(r,"MARKETBOOK",null)});};
  const copy=(ck,txt)=>{try{navigator.clipboard.writeText(txt);}catch(e){}setCp(ck);d({type:"TOAST",d:{msg:chan(ck).l+" copy ready — paste it in",t:Date.now()}});setTimeout(()=>setCp(""),1500);};
  const markChan=ck=>{if(!selEng)return;const cur=selEng.listedOn||[];const next=cur.includes(ck)?cur.filter(x=>x!==ck):[...cur,ck];d({type:"UPDATE",list:"inventory",id:selEng.id,d:{listedOn:next}});};
  const openAll=()=>{if(!selEng)return;CHANNELS.forEach(c=>window.open(c.url,"_blank"));d({type:"UPDATE",list:"inventory",id:selEng.id,d:{listedOn:[...new Set([...(selEng.listedOn||[]),...CHANNELS.map(c=>c.k)])]}});d({type:"TOAST",d:{msg:"Opened all 3 posting pages — paste & go",t:Date.now()}});};
  return (<div>
    <div className="rc-g4"><Stat label="Followers" value={(s.social||[]).reduce((a,ac)=>a+(ac.followers||0),0).toLocaleString()}/><Stat label="Leads" value={(s.leads||[]).length}/><Stat label="Ad Spend" value={$$((s.campaigns||[]).reduce((a,c)=>a+(c.spent||0),0))}/><Stat label="Campaigns" value={(s.campaigns||[]).length}/></div>
    <div className="rc-card" style={{padding:16,marginBottom:16,borderColor:"var(--ac)"}}>
      <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:17.5,letterSpacing:2,textTransform:"uppercase",color:"var(--act)"}}>⚡ 1-Post Funnel</div>
      <div style={{fontSize:13,color:"var(--tx2)",margin:"3px 0 12px"}}>Pick an engine, generate once, push to Facebook + Kijiji + MarketBook.</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <select className="rc-fi" value={selId} onChange={e=>{setSelId(e.target.value);setRes(null);}} style={{flex:1,minWidth:220,appearance:"none"}}><option value="">Select an engine...</option>{availEngs.map(e=>(<option key={e.id} value={e.id}>{e.name} · {e.price>0?"$"+e.price:"Core"}{(e.listedOn||[]).length?" · listed":""}</option>))}</select>
        <button className="rc-ba" disabled={!selId||gen} onClick={launch}>{gen?"⏳ Generating...":"✨ Generate Listings"}</button>
        {res&&<button className="rc-ba" onClick={openAll} style={{background:"var(--sf2)",color:"var(--act)"}}>🚀 Open All 3 + Mark Listed</button>}
      </div>
      {selEng&&(selEng.listedOn||[]).length>0&&<div style={{fontSize:12,color:"var(--tx2)",marginTop:10}}>Already advertised on: {(selEng.listedOn||[]).map(c=>chan(c).l).join(", ")}</div>}
      {res&&<div style={{display:"grid",gap:10,marginTop:14}}>{CHANNELS.map(c=>{const on=selEng&&(selEng.listedOn||[]).includes(c.k);return (<div key={c.k} className="rc-card" style={{padding:12,borderColor:tint(c.col,33)}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}><span style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:14.5,color:c.col,letterSpacing:1,textTransform:"uppercase"}}>{c.l}{on?" ✓":""}</span><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="rc-bs" onClick={()=>copy(c.k,res[c.k])}>{cp===c.k?"✓ Copied":"📋 Copy"}</button><button className="rc-bs" onClick={()=>window.open(c.url,"_blank")} style={{color:c.col,borderColor:c.col}}>↗ Open {c.l}</button><button className="rc-bs" onClick={()=>markChan(c.k)} style={on?{color:"var(--g)",borderColor:"var(--g)"}:{}}>{on?"✓ Posted":"Mark posted"}</button></div></div><div style={{background:"var(--sf2)",borderRadius:5,padding:11,fontSize:13.5,lineHeight:1.7,whiteSpace:"pre-wrap",color:"var(--tx)",maxHeight:220,overflowY:"auto"}}>{res[c.k]}</div></div>);})}</div>}
    </div>
    <SH title="Social Accounts"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-social"})}>+ Account</button></SH>
    {(s.social||[]).length===0?(<Empty icon="📱" title="No Accounts" sub="Add social media" action={()=>d({type:"MODAL",v:"add-social"})} label="+ Add"/>):(<Tbl headers={["Platform","Handle","Followers","Posts","Engage",""]}>{(s.social||[]).map(ac=>(<tr key={ac.id}><td className="rc-tn">{ac.platform}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{ac.handle}</td><td style={{fontWeight:600}}>{(ac.followers||0).toLocaleString()}</td><td style={{fontSize:13}}>{ac.posts||0}</td><td style={{fontSize:13,color:"var(--act)"}}>{ac.engagement?ac.engagement+"%":"—"}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-social",d:ac})} aria-label={"Edit "+recName(ac)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"social",id:ac.id})} aria-label={"Delete "+recName(ac)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    <SH title="Campaigns"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-campaign"})}>+ Campaign</button></SH>
    {(s.campaigns||[]).length>0&&<Tbl headers={["Name","Platform","Type","Reach","Leads","Spent","Status",""]}>{(s.campaigns||[]).map(c=>(<tr key={c.id}><td className="rc-tn">{c.name}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{c.platform}</td><td style={{fontSize:13}}>{c.type}</td><td style={{fontSize:13}}>{c.reach>0?(c.reach/1000).toFixed(1)+"k":"—"}</td><td style={{fontSize:13}}>{c.leads||"—"}</td><td style={{fontSize:13}}>{c.spent>0?"$"+c.spent:"Free"}</td><td><Badge s={c.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-campaign",d:c})} aria-label={"Edit "+recName(c)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"campaigns",id:c.id})} aria-label={"Delete "+recName(c)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>}
    <SH title="Content Calendar"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-content"})}>+ Entry</button></SH>{(s.contentCalendar||[]).length===0?(<Empty icon="📅" title="No Content Calendar" sub="Plan your weekly posts" action={()=>d({type:"MODAL",v:"add-content"})} label="+ Add"/>):(<Tbl headers={["Day","Content","Platform","Notes",""]}>{(s.contentCalendar||[]).map((c,i)=>(<tr key={c.id||i}><td style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--act)"}}>{c.day}</td><td className="rc-tn">{c.type}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{c.platform}</td><td style={{fontSize:13,color:"var(--mt)"}}>{c.notes}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-content",d:c})} aria-label={"Edit "+recName(c)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"contentCalendar",id:c.id})} aria-label={"Delete "+recName(c)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
    <SH title="Leads"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-lead"})}>+ Lead</button></SH>
    <Fil opts={[["all","All"],["new","New"],["contacted","Contacted"],["quoted","Quoted"],["negotiating","Negotiating"],["converted","Won"],["lost","Lost"]]} active={lf} set={slf}/>
    {fL.length===0?(<Empty icon="🎯" title="No Leads" sub="Track leads" action={()=>d({type:"MODAL",v:"add-lead"})} label="+ Lead"/>):(<Tbl headers={["Name","Interest","Source","Prov","Status",""]}>{fL.map(l=>(<tr key={l.id}><td className="rc-tn">{l.name}</td><td style={{color:"var(--act)",fontSize:13}}>{l.interest}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{l.source}</td><td style={{fontSize:13}}>{l.province}</td><td><Badge s={l.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-lead",d:l})} aria-label={"Edit "+recName(l)} title="Edit" style={{fontSize:14.5}}>✎</button><select className="rc-fi" value={l.status} onChange={e=>d({type:"UPDATE",list:"leads",id:l.id,d:{status:e.target.value}})} style={{width:90,padding:"3px",fontSize:12}}>{["new","contacted","quoted","negotiating","converted","lost"].map(st=>(<option key={st} value={st}>{st}</option>))}</select><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"leads",id:l.id})} aria-label={"Delete "+recName(l)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE (compact)
// ═══════════════════════════════════════════════════════════════
function Schedule({s,d}){
  // The week runs Monday to Sunday in Medicine Hat, and every day is a YYYY-MM-DD string, so an evening
  // booking never lands on the wrong day (a UTC date is already tomorrow after 6 PM).
  const[wo,setWo]=useState(0);const td=Tsh.shopToday();const ws=Tsh.addDaysISO(Tsh.weekStart(td),wo*7);
  const days=Array.from({length:7},(_,i)=>Tsh.addDaysISO(ws,i));
  // One row per tech, plus "Unassigned" for bookings nobody has been given yet.
  const noTech=a=>!a.tech||a.tech==="Unassigned";const ofTech=(a,tech)=>tech?a.tech===tech:noTech(a);
  const techs=[...[...new Set((s.schedule||[]).map(a=>a.tech).concat((s.employees||[]).filter(e=>e.status==="active").map(e=>e.nick||e.name)))].filter(t=>t&&t!=="Unassigned").sort(),...((s.schedule||[]).some(noTech)?[""]:[])];
  const wl=Tsh.shortDate(days[0])+" – "+Tsh.shortDate(days[6])+", "+days[6].slice(0,4);
  // Prospect / shop follow-ups: due and the next 7 days in a card, and on the week grid by day.
  const fus=resFollowups(s,7);const wk0=days[0],wk6=days[6];const fuWeek=resFollowups(s,3650).filter(([,r])=>r.nextFollowUp>=wk0&&r.nextFollowUp<=wk6);
  return (<div>
    <SH title="Schedule"><div style={{display:"flex",gap:6,alignItems:"center"}}><button className="rc-bs" onClick={()=>setWo(w=>w-1)}>◄</button><span style={{fontSize:14,color:"var(--tx2)",minWidth:150,textAlign:"center"}}>{wl}</span><button className="rc-bs" onClick={()=>setWo(w=>w+1)}>►</button><button className="rc-bs" onClick={()=>setWo(0)}>Today</button></div><div style={{display:"flex",gap:6}}><button className="rc-ba rc-noprint" onClick={()=>window.print()}>🖨</button><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-appt"})}>+ Book</button></div></SH>
    {fus.length>0&&(<div className="rc-card" style={{padding:"4px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"10px 0 6px",flexWrap:"wrap"}}><b style={{fontSize:15}}>Prospect follow-ups</b><span style={{fontSize:12.5,color:"var(--mt)"}}>{fus.filter(([,r])=>r.nextFollowUp<=td).length} due · the next 7 days</span></div>{fus.map(([list,r])=>{const late=r.nextFollowUp<td,now=r.nextFollowUp===td;const ll=lastTouch(r);return(<div key={list+":"+r.id} className="rc-fu-row"><span style={{flex:1,minWidth:180}}><button className="rc-lnk" onClick={()=>d({type:"MODAL",v:"pros-rec",d:{list,id:r.id}})}>{r.name}</button><span style={{display:"block",fontSize:12.5,color:"var(--mt)"}}>{list==="competitors"?"Shop":"Fleet"}{r.city?" · "+r.city:""}{ll&&ll.outcome?" · last: "+ll.outcome:""}</span></span><span style={{fontSize:13.5,fontWeight:600,whiteSpace:"nowrap",color:late?"var(--r)":now?"var(--w)":"var(--tx2)"}}>{late?"Overdue · "+r.nextFollowUp:now?"Due today":r.nextFollowUp}</span><button className="rc-bs" disabled={r.status==="do-not-contact"} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list,id:r.id}})}>Log visit</button></div>);})}</div>)}
    {(s.schedule||[]).length===0&&techs.length===0?(<Empty icon="📅" title="No Appointments" sub="Book appointments" action={()=>d({type:"MODAL",v:"add-appt"})} label="+ Book"/>):(<div className="rc-card" style={{overflowX:"auto"}}><table className="rc-tbl" style={{minWidth:800}}><thead><tr><th style={{width:80}}>Tech</th>{days.map((iso,i)=>(<th key={i} style={{textAlign:"center",color:iso===td?"var(--ac)":undefined}}>{["M","T","W","T","F","S","S"][i]} {+iso.slice(8)}</th>))}</tr></thead><tbody>{techs.map(tech=>(<tr key={tech||"none"}><td style={{fontFamily:"var(--fd)",fontWeight:600,fontSize:13,color:tech?undefined:"var(--mt)"}}>{tech||"Unassigned"}</td>{days.map((iso,i)=>{const appts=(s.schedule||[]).filter(a=>ofTech(a,tech)&&a.date===iso);return (<td key={i} style={{verticalAlign:"top",padding:"6px 4px"}}>{appts.map(a=>(<div key={a.id} onClick={()=>d({type:"MODAL",v:"appt-detail",d:a})} style={{background:a.status==="confirmed"?"var(--bs)":"var(--ws)",border:`1px solid ${a.status==="confirmed"?"var(--b)":"var(--w)"}`,borderRadius:3,padding:"4px 6px",marginBottom:3,cursor:"pointer",fontSize:11}}><div style={{fontWeight:600}}>{a.time}</div><div style={{color:"var(--act)"}}>{a.service}</div></div>))}</td>);})}</tr>))}{fuWeek.length>0&&<tr><td style={{fontFamily:"var(--fd)",fontWeight:600,fontSize:13}}>Follow-ups</td>{days.map((iso,i)=>{return (<td key={i} style={{verticalAlign:"top",padding:"6px 4px"}}>{fuWeek.filter(([,r])=>r.nextFollowUp===iso).map(([list,r])=>(<div key={list+":"+r.id} onClick={()=>d({type:"MODAL",v:"pros-rec",d:{list,id:r.id}})} style={{background:"var(--acs)",border:"1px solid var(--ac)",borderRadius:3,padding:"4px 6px",marginBottom:3,cursor:"pointer",fontSize:12}}>{r.name}</div>))}</td>);})}</tr>}</tbody></table></div>)}
    <SH title="All Appointments"/><Tbl headers={["Date","Time","Customer","Service","Tech","Status",""]}>{[...(s.schedule||[])].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(a=>(<tr key={a.id}><td style={{fontSize:13}}>{a.date}</td><td style={{fontSize:13,fontWeight:600}}>{a.time}</td><td className="rc-tn">{cn(s.customers,a.custId)}</td><td style={{fontSize:13,color:"var(--act)",cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"appt-detail",d:a})}>{a.service}</td><td style={{fontSize:13}}>{a.tech}</td><td><Badge s={a.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-appt",d:a})} aria-label={"Edit "+recName(a)} title="Edit" style={{fontSize:14.5}}>✎</button>{a.status==="pending"&&<button className="rc-bs rc-bsg" onClick={()=>d({type:"UPDATE",list:"schedule",id:a.id,d:{status:"confirmed"}})}>✓</button>}<button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"schedule",id:a.id})} aria-label={"Delete "+recName(a)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES (compact — includes expenses)
// ═══════════════════════════════════════════════════════════════
// Logins (owner, cloud): who on the team can sign in, from the team-logins Edge Function. Shared by the
// Team table and the login modal; refreshLogins() reloads it after a change.
let LOGINS={list:null,err:""};const LOGIN_SUBS=new Set();
async function refreshLogins(){const r=await listLogins();LOGINS=r.error?{list:LOGINS.list,err:r.error}:{list:r.logins||[],err:""};LOGIN_SUBS.forEach(f=>f(LOGINS));return LOGINS;}
function useLogins(on){const[st,setSt]=useState(LOGINS);useEffect(()=>{if(!on||!canManageLogins)return;LOGIN_SUBS.add(setSt);setSt(LOGINS);if(!LOGINS.list)refreshLogins();return()=>{LOGIN_SUBS.delete(setSt);};},[on]);return st;}
const loginFor=(st,emp)=>((st&&st.list)||[]).find(l=>l.employeeId!=null&&String(l.employeeId)===String(emp.id))||null;
// role: the login's role ("owner" / "staff"); owner: the owner, not previewing as staff.
function Emps({s,d,role="owner",owner=true,preview=null,setPreview=()=>{}}){
  const[view,setView]=useState(()=>getPref("rc:teamView","team")==="timesheets"?"timesheets":"team");
  const pick=v=>{setView(v);setPref("rc:teamView",v);};
  const seg=(<div className="rc-seg two rc-ts-seg" role="group" aria-label="Team or timesheets">{[["team","Team"],["timesheets","Timesheets"]].map(([k,l])=>(<button key={k} className={view===k?"on":""} aria-pressed={view===k} onClick={()=>pick(k)}>{l}</button>))}</div>);
  const logins=useLogins(owner);
  if(view==="timesheets")return(<div>{seg}<Timesheets s={s} d={d} role={role} owner={owner} preview={preview} setPreview={setPreview}/></div>);
  const today=Tsh.shopToday();const todayN=(s.employees||[]).filter(e=>e.status==="active"&&(s.timesheets||[]).some(t=>String(t.emp)===String(e.id)&&t.date===today&&Tsh.isFilled(t))).length;
  const showLogin=owner&&canManageLogins;
  const wk0=Tsh.weekStart(today);const wkMin=(s.employees||[]).reduce((a,e)=>a+Object.values(Tsh.computeDays(tsRowsOf(s,e.id)).days).filter(x=>x.date>=wk0).reduce((b,x)=>b+x.min,0),0);
  const payroll=(s.employees||[]).reduce((a,e)=>a+(e.rate||0)*(e.hrs||0),0);
  // Tech productivity
  const techJobs={};(s.jobs||[]).forEach(j=>{if(j.tech)techJobs[j.tech]=(techJobs[j.tech]||0)+1;});
  const techComplete={};(s.jobs||[]).filter(j=>j.status==="complete").forEach(j=>{if(j.tech)techComplete[j.tech]=(techComplete[j.tech]||0)+1;});
  return (<div>{seg}
    <div className="rc-g4"><Stat label="Team" value={(s.employees||[]).length}/><Stat label="Active" value={(s.employees||[]).filter(e=>e.status==="active").length}/>{owner?<><Stat label="Weekly Payroll" value={$$(payroll)}/><Stat label="Monthly Est." value={$$(payroll*4.33)}/></>:<><Stat label="Filled in today" value={todayN} sub={"of "+(s.employees||[]).filter(e=>e.status==="active").length+" active"}/><Stat label="Paid hours this week" value={fH(wkMin)}/></>}</div>
    <SH title="Team"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-emp"})}>+ Employee</button></SH>
    {(s.employees||[]).length===0?(<Empty icon="🧑‍🔧" title="No Employees" sub="Add team" action={()=>d({type:"MODAL",v:"add-emp"})} label="+ Add"/>):(<><Tbl headers={owner?["Name","Role","Rate","Hrs","Weekly","Jobs","Completed",...(showLogin?["Login"]:[]),"Status",""]:["Name","Role","Hrs","Jobs","Completed","Status",""]}>{(s.employees||[]).map(e=>{const nick=e.nick||e.name;return (<tr key={e.id}><td className="rc-tn" style={{cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"emp-detail",d:e})}>{e.name}</td><td style={{fontSize:13,color:"var(--act)"}}>{e.role}</td>{owner&&<td style={{fontSize:13}}>${e.rate||0}/hr</td>}<td style={{fontSize:13}}>{e.hrs||0}</td>{owner&&<td style={{fontWeight:600}}>{$$((e.rate||0)*(e.hrs||0))}</td>}<td style={{fontSize:13}}>{techJobs[nick]||0}</td><td style={{fontSize:13,color:"var(--g)"}}>{techComplete[nick]||0}</td>{showLogin&&<td>{(()=>{const L=loginFor(logins,e);return L?<button className="rc-lnk rc-ts-ln" onClick={()=>d({type:"MODAL",v:"emp-login",d:{emp:e}})}>{L.role==="employee"?"Timesheet login":"Office login"}</button>:<button className="rc-bs" style={{fontSize:13}} onClick={()=>d({type:"MODAL",v:"emp-login",d:{emp:e}})}>Give a login</button>;})()}</td>}<td><Badge s={e.status}/></td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-emp",d:e})} aria-label={"Edit "+recName(e)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs" onClick={()=>d({type:"UPDATE",list:"employees",id:e.id,d:{status:e.status==="active"?"on-leave":"active"}})} style={{fontSize:14.5}}>{e.status==="active"?"⏸":"▶"}</button></BtnRow></td></tr>);})}</Tbl>
    {showLogin&&logins.err&&<div className="rc-ts-errl">Couldn't load the logins: {logins.err}</div>}
    <SH title="Expenses"><button className="rc-ba" onClick={()=>d({type:"MODAL",v:"add-expense"})}>+ Expense</button></SH>
    <Tbl headers={["Category","Amount","Freq","Notes",""]}>{(s.expenses||[]).map(e=>(<tr key={e.id}><td className="rc-tn">{e.cat}</td><td style={{fontWeight:600}}>{$$(e.amount)}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{Mny.freqLabel(e.freq)}</td><td style={{fontSize:13,color:"var(--mt)"}}>{e.notes}</td><td><BtnRow><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-expense",d:e})} aria-label={"Edit "+recName(e)} title="Edit" style={{fontSize:14.5}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"expenses",id:e.id})} aria-label={"Delete "+recName(e)} title="Delete" style={{fontSize:14.5}}>×</button></BtnRow></td></tr>))}</Tbl></>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// TIMESHEETS — hours typed in the app (each employee's own screen; Team → Timesheets)
// ═══════════════════════════════════════════════════════════════
// The hours, overtime and pay-period math is src/lib/timesheet.js (Tsh), and so are
// the rules on who may change which day (dayAccess). The database enforces the same
// rules for real (migration 0011). Wages and pay only show when `owner` is true.
const fH=m=>Tsh.fmtH(m);
const fmtWhen=iso=>{const t=new Date(iso);if(!iso||isNaN(t))return "";const same=t.toDateString()===new Date().toDateString();return (same?"today":t.toLocaleDateString("en-US",{month:"short",day:"numeric"}))+", "+t.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});};
const firstName=n=>String(n||"").trim().split(/\s+/)[0]||"";
const tsRowsOf=(s,emp)=>(s.timesheets||[]).filter(r=>String(r.emp)===String(emp));
const tsTech=(e,t)=>{const k=String(t||"").trim().toLowerCase();return !!k&&[e.nick,e.name].filter(Boolean).some(n=>String(n).trim().toLowerCase()===k);};
// Hours on jobs by date for one person: work-order time, diagnoses and ECM jobs, by the date logged.
function tsJobHours(s,e){const m={};const add=(dt,h)=>{if(dt&&+h>0)m[dt]=(m[dt]||0)+(+h);};(s.timeEntries||[]).forEach(t=>{if(tsTech(e,t.tech))add(t.date,t.hours);});(s.diagnoses||[]).forEach(x=>{if(tsTech(e,x.tech))add(x.date,x.hours);});(s.ecmJobs||[]).forEach(j=>{if(tsTech(e,j.tech))add(j.date,j.hours);});return m;}
const tsJobIn=(jh,a,b)=>Object.keys(jh).reduce((t,k)=>k>=a&&k<=b?t+jh[k]:t,0);
// Pay: the person's Rate on the Team tab; overtime at the shop's OT rate (1.5× unless changed in Timesheet settings).
const tsOtRate=s=>+getSet(s).otRate||1.5;
const tsPayFor=(s,e)=>{const ot=tsOtRate(s);return()=>(+e.rate>0?{wage:+e.rate,otRate:ot}:null);};
const tsSet=s=>{const st=getSet(s);return{kind:st.payPeriod||"monthly",anchor:st.payAnchor||""};};
const tsRule=w=>w.rule==="weekly"?"44-hour weekly rule":w.rule==="daily"?"daily rule (over 8 h a day)":"no overtime";
// One person's pay period: every day in it (blank ones too, for attendance), overtime split over
// whole Monday weeks (a week can reach into the next period), totals, flags and pay.
// Unallocated = paid hours not on any job, day by day.
function tsPeriod(s,e,P){
  const rows=tsRowsOf(s,e.id),calc=Tsh.computeDays(rows),jh=tsJobHours(s,e),by=new Map(rows.map(r=>[r.date,r]));
  const dates=Tsh.rangeDays(P.start,P.end);
  const un=dt=>Math.max(0,((calc.days[dt]||{}).min||0)/60-(jh[dt]||0));
  const weeks=[...new Set(dates.map(Tsh.weekStart))].map(w=>{const W=calc.weeks[w]||{start:w,end:Tsh.addDaysISO(w,6),dates:[],min:0,regMin:0,otMin:0,dailyMin:0,weeklyMin:0,rule:"none"};return{...W,days:dates.filter(x=>Tsh.weekStart(x)===w),outside:W.dates.filter(x=>x<P.start||x>P.end),job:tsJobIn(jh,W.start,W.end),unalloc:W.dates.reduce((a,x)=>a+un(x),0)};});
  const ds=dates.map(x=>calc.days[x]).filter(Boolean);
  const tot={min:ds.reduce((a,x)=>a+x.min,0),reg:ds.reduce((a,x)=>a+x.regMin,0),ot:ds.reduce((a,x)=>a+x.otMin,0)};
  const flags={};dates.forEach(x=>{const r=by.get(x);if(r){const f=Tsh.dayFlags(r,calc.days[x]);if(f.length)flags[x]=f;}});
  const today=Tsh.shopToday();
  return{by,calc,jh,dates,weeks,ds,tot,job:tsJobIn(jh,P.start,P.end),unalloc:dates.reduce((a,x)=>a+un(x),0),flags,pay:Tsh.payTotals(ds,tsPayFor(s,e)),
    worked:ds.filter(x=>x.min>0).length,missing:dates.filter(x=>x<today&&Tsh.isWeekday(x)&&!Tsh.isFilled(by.get(x))),edited:dates.filter(x=>Tsh.wasEdited(by.get(x))),
    over:Object.keys(jh).filter(k=>k>=P.start&&k<=P.end&&jh[k]-((calc.days[k]||{}).min||0)/60>0.01).sort(),
    appr:(s.payPeriods||[]).find(p=>String(p.emp)===String(e.id)&&p.start===P.start&&p.end===P.end)||null};}
// Notes → links to what we have: an engine's stock #, a unit # on a work order or ECM job,
// a WO # on a teardown worksheet. Returns [] when nothing matches.
const reEsc=t=>String(t).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const normU=t=>String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
function tsLinks(s,txt){const t=String(txt||"");if(!t)return [];const hits=[];
  (s.inventory||[]).forEach(i=>[i.sku,...(i.oldSkus||[])].filter(k=>k&&String(k).trim().length>=3).forEach(k=>{const m=t.match(new RegExp("(^|[^A-Za-z0-9])("+reEsc(String(k).trim())+")(?![A-Za-z0-9])","i"));if(m)hits.push({at:m.index+m[1].length,len:m[2].length,to:{v:"part-detail",d:i},tip:"Open engine "+i.sku});}));
  t.replace(/\b(?:unit|truck)\s*#?\s*([A-Za-z0-9][A-Za-z0-9-]*)/gi,(m0,u,at)=>{const nu=normU(u);const ej=(s.ecmJobs||[]).find(j=>j.unit&&normU(j.unit)===nu);const jb=(s.jobs||[]).find(j=>String(j.vehicle||"").split(/[^A-Za-z0-9-]+/).some(x=>x&&normU(x)===nu));const to=ej?{v:"ecm-job",d:{id:ej.id}}:jb?{v:"job-detail",d:jb}:null;if(nu&&to)hits.push({at,len:m0.length,to,tip:ej?"Open the ECM job for unit "+u:"Open the work order for unit "+u});return m0;});
  t.replace(/\b(?:w\.?o\.?|work\s*order)\s*#?\s*([A-Za-z0-9][A-Za-z0-9-]*)/gi,(m0,w,at)=>{const nw=normU(w);const jb=(s.jobs||[]).find(j=>j.wo&&normU(j.wo)===nw);const sh=(s.bomSheets||[]).find(x=>x.wo&&normU(x.wo)===nw);const eng=sh?(s.inventory||[]).find(i=>i.id===+sh.engineId):null;const to=jb?{v:"job-detail",d:jb}:eng?{v:"part-detail",d:{...eng,ptab:"bom"}}:null;if(nw&&to)hits.push({at,len:m0.length,to,tip:"Open WO "+w});return m0;});
  hits.sort((a,b)=>a.at-b.at);const out=[];let p=0;hits.forEach(h=>{if(h.at<p)return;if(h.at>p)out.push(t.slice(p,h.at));out.push({text:t.slice(h.at,h.at+h.len),to:h.to,tip:h.tip});p=h.at+h.len;});if(p<t.length)out.push(t.slice(p));
  return out.some(x=>typeof x!=="string")?out:[];}
function TsNote({s,d,txt}){const parts=tsLinks(s,txt);if(!parts.length)return <>{txt||""}</>;return <>{parts.map((p,k)=>typeof p==="string"?<span key={k}>{p}</span>:<button key={k} className="rc-lnk rc-ts-ln" title={p.tip} onClick={()=>d({type:"MODAL",v:p.to.v,d:p.to.d})}>{p.text}</button>)}</>;}
// Save a day, from the day editor or the Full day button. The database stamps who and
// when, and keeps the old version; the local mode keeps it here (nextEntry).
function tsSave(s,d,{emp,date,vals,label}){
  const prev=(s.timesheets||[]).find(r=>r.id===Tsh.entryId(emp,date));
  const rec=Tsh.nextEntry(prev,vals,{emp,date,by:CURRENT_USER,now:nowIso(),keepHistory:!usingCloud});
  if(prev){d({type:"UPDATE",list:"timesheets",id:prev.id,d:rec});d({type:"TOAST",d:{msg:label,t:Date.now()}});}
  else d({type:"ADD",list:"timesheets",d:rec,keep:true,label});
}
// A day filled in late or changed afterwards: every version, oldest first, for the owner.
function TsHistory({r}){if(!r||!Tsh.wasEdited(r))return null;const vs=[...(r.history||[]),{at:r.updatedAt,by:r.by,start:r.start,finish:r.finish,notes:r.notes,now:true}];
  return(<div className="rc-ts-hist"><div className="rc-fl">{Tsh.enteredLate(r)&&!(r.history||[]).length?"Filled in after the day":"Changed after it was filled in"}</div>{vs.map((x,k)=>(<div key={k} className={x.now?"now":""}><span>{fmtWhen(x.at)}{x.by?" · "+x.by:""}</span><b>{[x.start?x.start+" to "+x.finish:"",x.notes].filter(Boolean).join(" · ")||"cleared"}{x.now?" (now)":""}</b></div>))}</div>);}

// The pay-period summary for printing: black and white, one Letter page for a month.
const TS_PRINT='@page{size:letter portrait;margin:10mm 11mm;}body{padding:0;font-size:11px;line-height:1.35;}.head{border-bottom-color:#000;padding-bottom:5px;margin-bottom:7px;}.logo{background:#000;width:34px;height:34px;font-size:16px;}h1{font-size:20px;}.meta{font-size:10px;line-height:1.45;}.sub{color:#000;}h2{border-left-color:#000;font-size:12.5px;margin:7px 0 2px;}.en{font-size:20px;}.esn{font-size:10.5px;margin-top:1px;}.st{margin-top:4px;font-size:9.5px;padding:1px 8px;border-color:#000;}.tt{align-items:flex-end;margin-bottom:5px;}table.pay td{padding:1.5px 6px;font-size:11px;line-height:1.3;}.sm{display:grid;grid-template-columns:repeat(4,auto);gap:4px 16px;text-align:right;}.sm div{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:17px;}.sm span{display:block;font-family:"IBM Plex Mono",monospace;font-weight:400;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#555;}'+
  'table.ts th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;border-bottom:1.5px solid #000;padding:3px 5px;}table.ts th.num{text-align:right;}table.ts td{padding:1px 5px;font-size:10.5px;line-height:1.25;border-bottom:1px solid #ddd;}td.nt{font-size:9.5px;color:#333;}tr.off td{color:#888;}tr.wk td{background:none;border-top:1px solid #000;border-bottom:1px solid #000;font-size:10px;font-weight:600;white-space:nowrap;}tr.wk td.num{font-size:11px;}tr.tot td{background:none!important;border-top:2px solid #000;font-weight:800;font-size:12px;}.dim{color:#555;font-style:italic;font-size:11px;}'+
  '.sig{display:grid;grid-template-columns:2fr 1fr 2fr 1fr;gap:18px;margin-top:18px;}.sig div{border-top:1px solid #000;padding-top:2px;font-size:9.5px;color:#333;}.foot{margin-top:10px;padding-top:5px;font-size:9.5px;}';
function printTimesheet(s,e,P,owner){
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const T=tsPeriod(s,e,P),lab=Tsh.periodLabel(P);let rows="";
  T.weeks.forEach(w=>{
    w.days.forEach(x=>{const r=T.by.get(x),c=T.calc.days[x],fl=T.flags[x]||[];
      rows+='<tr'+(c&&c.min?'':' class="off"')+'><td>'+esc(Tsh.shortDate(x))+'</td><td>'+esc(Tsh.dow(x))+'</td><td>'+esc(r?r.start:"")+'</td><td>'+esc(r?r.finish:"")+'</td><td class="num">'+(c&&c.min?fH(c.min):"")+'</td><td class="num">'+(c&&c.min?fH(c.regMin):"")+'</td><td class="num">'+(c&&c.otMin?fH(c.otMin):"")+'</td><td class="nt">'+esc(r?r.notes:"")+(fl.length?' <b>&#9873; '+esc(fl.map(f=>f.msg).join(" "))+'</b>':'')+(r&&Tsh.wasEdited(r)?' <b>[changed after the day]</b>':'')+'</td></tr>';});
    rows+='<tr class="wk"><td colspan="4">Week of '+esc(Tsh.shortDate(w.start))+' &middot; '+(w.rule==="weekly"?"44-hour rule":w.rule==="daily"?"daily rule":"no OT")+'</td><td class="num">'+fH(w.min)+'</td><td class="num">'+fH(w.regMin)+'</td><td class="num">'+fH(w.otMin)+'</td><td class="nt">over 8 a day '+fH(w.dailyMin)+' &middot; over 44 a week '+fH(w.weeklyMin)+(w.outside.length?' &middot; counts '+w.outside.length+' day'+(w.outside.length===1?'':'s')+' outside this period':'')+'</td></tr>';});
  rows+='<tr class="tot"><td colspan="4">Total &middot; '+esc(lab)+'</td><td class="num">'+fH(T.tot.min)+'</td><td class="num">'+fH(T.tot.reg)+'</td><td class="num">'+fH(T.tot.ot)+'</td><td></td></tr>';
  const ot=tsOtRate(s),rate=+e.rate||0;
  const pay=owner?'<h2>Gross pay</h2><table class="pay"><tr><td>Regular '+fH(T.pay.regMin)+' h &times; '+$$(rate)+'</td><td class="num">'+$$(T.pay.regPay)+'</td></tr><tr><td>Overtime '+fH(T.pay.otMin)+' h &times; '+$$(rate*ot)+' ('+ot+'&times;)</td><td class="num">'+$$(T.pay.otPay)+'</td></tr><tr class="tot"><td>Gross pay, before deductions (CPP, EI, tax)</td><td class="num">'+$$(T.pay.gross)+'</td></tr></table>'+(rate>0?'':'<p class="dim">No pay rate on the Team tab, so gross pay is not worked out.</p>'):'';
  const st=T.appr?'Approved '+esc(new Date(T.appr.approvedAt).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}))+(T.appr.approvedBy?' by '+esc(T.appr.approvedBy):''):'Not approved yet';
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Timesheet · '+esc(e.name)+' · '+esc(lab)+'</title>'+SHEET_STYLE+'<style>'+TS_PRINT+'</style></head><body>'+
    '<div class="head"><div class="brand"><div class="logo">RC</div><div><h1>Rollin Coal</h1><div class="sub">Pay period summary</div></div></div><div class="meta"><strong>Timesheet</strong><br>Printed '+new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})+'<br>2040 11th Ave NW, Medicine Hat, AB</div></div>'+
    '<div class="tt"><div><div class="en">'+esc(e.name)+'</div><div class="esn">'+(e.role?esc(e.role)+' &middot; ':'')+esc(lab)+' ('+esc(Tsh.shortDate(P.start))+' to '+esc(Tsh.shortDate(P.end))+')</div><span class="st">'+st+'</span></div><div class="sm"><div><span>Hours</span>'+fH(T.tot.min)+'</div><div><span>Regular</span>'+fH(T.tot.reg)+'</div><div><span>Overtime</span>'+fH(T.tot.ot)+'</div><div><span>Unallocated</span>'+T.unalloc.toFixed(2)+'</div></div></div>'+
    '<table class="ts"><thead><tr><th>Date</th><th>Day</th><th>Start</th><th>Finish</th><th class="num">Hours</th><th class="num">Regular</th><th class="num">OT</th><th>Notes</th></tr></thead><tbody>'+rows+'</tbody></table>'+pay+
    '<div class="sig"><div>Employee signature</div><div>Date</div><div>Approved by</div><div>Date</div></div>'+
    '<div class="foot"><span>Hours from Start and Finish; lunch is paid. Overtime by Alberta&#39;s rule: over 8 h a day or 44 h a week, whichever is more.</span><span>Rollin Coal &middot; confidential</span></div>'+
    '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},300);};</scr'+'ipt></body></html>';
  const w=window.open("","_blank","width=920,height=1080");if(!w)return;
  w.document.open();w.document.write(html);w.document.close();
}

// Team → Timesheets: the owner's and office staff's view of everyone's hours.
// role: the login's role ("owner" / "staff"); owner: the owner, not previewing as staff.
function Timesheets({s,d,role,owner,preview,setPreview}){
  const emps=[...(s.employees||[])].sort((a,b)=>(a.status==="active"?0:1)-(b.status==="active"?0:1)||String(a.name||"").localeCompare(String(b.name||"")));
  const has=new Set((s.timesheets||[]).map(r=>String(r.emp)));
  const[emp,setEmp]=useState(()=>{const e0=emps.find(x=>has.has(String(x.id)))||emps.find(x=>x.status==="active")||emps[0];return e0?String(e0.id):"";});
  const[per,setPer]=useState("");const[open,setOpen]=useState(null);
  const today=Tsh.shopToday();const canEdit=role==="owner"&&owner;
  const e=emps.find(x=>String(x.id)===emp)||null;
  const{kind,anchor}=tsSet(s);
  const periods=Tsh.periodList(e?tsRowsOf(s,e.id).map(r=>r.date):[],kind,anchor,today);
  const P=periods.find(p=>p.start===per)||periods.find(p=>p.start<=today&&p.end>=today)||periods[0];
  const T=e&&P?tsPeriod(s,e,P):null;
  const approve=()=>{if(!T)return;d({type:"ADD",list:"payPeriods",d:{emp:e.id,empName:e.name,start:P.start,end:P.end,kind:P.kind,title:"Timesheet approved · "+e.name+" · "+Tsh.periodLabel(P),approvedAt:nowIso(),approvedBy:CURRENT_USER,hours:+fH(T.tot.min),reg:+fH(T.tot.reg),ot:+fH(T.tot.ot)},label:"✓ Approved "+Tsh.periodLabel(P)+". "+firstName(e.name)+" can't change those days now."});};
  const flagN=T?Object.keys(T.flags).length:0;
  const crew=P?emps.filter(x=>x.status==="active"||has.has(String(x.id))).map(x=>({x,t:tsPeriod(s,x,P)})).filter(o=>o.t.ds.length||o.x.status==="active"):[];
  const todayList=emps.filter(x=>x.status==="active").map(x=>({x,r:(s.timesheets||[]).find(t=>String(t.emp)===String(x.id)&&t.date===today)}));
  const openDay=x=>d({type:"MODAL",v:"ts-day",d:{emp:e.id,name:e.name,date:x}});
  const ot=tsOtRate(s);
  return(<div>
    <div className="rc-ts-bar">
      <select className="rc-fi rc-ts-sel" aria-label="Employee" value={emp} onChange={ev=>{setEmp(ev.target.value);setPer("");setOpen(null);}}>{emps.length===0&&<option value="">No team members yet</option>}{emps.map(x=>(<option key={x.id} value={String(x.id)}>{x.name}</option>))}</select>
      <select className="rc-fi rc-ts-sel" aria-label="Pay period" value={P?P.start:""} onChange={ev=>{setPer(ev.target.value);setOpen(null);}}>{periods.map(p=>(<option key={p.start} value={p.start}>{Tsh.periodLabel(p)}{e&&(s.payPeriods||[]).some(a=>String(a.emp)===String(e.id)&&a.start===p.start&&a.end===p.end)?" · approved":""}</option>))}</select>
      <button className="rc-bs" disabled={!T||!T.ds.length} onClick={()=>printTimesheet(s,e,P,owner)}>🖨 Print</button>
      {canEdit&&<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"ts-settings"})}>⚙ Settings</button>}
      {canEdit&&e&&<button className="rc-bs" onClick={()=>setPreview({emp:e.id,name:e.name})} title="See exactly what this employee sees when they sign in">👁 See {firstName(e.name)}'s screen</button>}
      {role==="owner"&&<button className={"rc-fb"+(preview==="staff"?" on":"")} aria-pressed={preview==="staff"} onClick={()=>setPreview(preview==="staff"?null:"staff")} title="See what an office staff login sees: hours, no dollar amounts">{preview==="staff"?"Back to owner view":"Preview as staff"}</button>}
    </div>
    {!owner&&<div className="rc-ts-note">{preview==="staff"?"Previewing as staff: ":""}Hours only. Wages and pay show on the owner's login.</div>}
    {todayList.length>0&&<div className="rc-card rc-ts-today"><div className="rc-ts-ph">Today · {Tsh.longDate(today)}</div><div className="rc-ts-tl">{todayList.map(({x,r})=>(<button key={x.id} className={"rc-ts-tc"+(Tsh.isFilled(r)?"":" none")} onClick={()=>{setEmp(String(x.id));setPer("");setOpen(null);}}><b>{x.name}</b><span>{r&&r.start?r.start+" to "+r.finish:r&&r.notes?r.notes:"Not filled in yet"}</span></button>))}</div></div>}
    {!e?<Empty icon="🕒" title="No team members yet" sub="Add your team, then give each one a login" action={()=>d({type:"MODAL",v:"add-emp"})} label="+ Employee"/>:
    (<>
      <div className="rc-g4">
        <Stat label="Hours" value={fH(T.tot.min)} sub={T.worked+" day"+(T.worked===1?"":"s")+" worked"}/>
        <Stat label="Regular" value={fH(T.tot.reg)}/>
        <Stat label="Overtime" value={fH(T.tot.ot)} sub={T.weeks.some(w=>w.rule==="weekly")?"incl. the 44-hour weekly rule":"over 8 h a day"}/>
        {owner?<Stat label="Gross pay" value={$$(T.pay.gross)} sub="before deductions"/>:<Stat label="Unallocated" value={T.unalloc.toFixed(2)} sub="paid, not on a job"/>}
      </div>
      <div className="rc-ts-appr">
        {T.appr?(<><span className="rc-ts-ok">✓ Approved {fmtWhen(T.appr.approvedAt)}{T.appr.approvedBy?" by "+T.appr.approvedBy:""}. {firstName(e.name)} can't change these days now.</span>{canEdit&&<button className="rc-bs" onClick={()=>(s.payPeriods||[]).filter(a=>String(a.emp)===String(e.id)&&a.start===P.start&&a.end===P.end).forEach(a=>d({type:"DELETE",list:"payPeriods",id:a.id}))}>Reopen</button>}</>)
        :(<>{T.missing.length>0&&<span className="rc-ts-cnt">{T.missing.length} weekday{T.missing.length===1?"":"s"} not filled in</span>}{flagN>0&&<span className="rc-ts-cnt">⚠ {flagN} to check</span>}{T.edited.length>0&&<span className="rc-ts-cnt info">{T.edited.length} filled in or changed after the day</span>}
          {canEdit?(P.end<=today?<button className="rc-ba" onClick={approve}>✓ Approve {Tsh.periodLabel(P)}</button>:<span className="rc-ts-note" style={{margin:0}}>You can approve {Tsh.periodLabel(P)} once it ends on {Tsh.shortDate(P.end)}.</span>):<span className="rc-ts-note" style={{margin:0}}>Not approved yet. The owner approves pay periods.</span>}</>)}
      </div>
      <div className="rc-card"><table className="rc-tbl rc-ts-tbl"><thead><tr><th>Date</th><th>Day</th><th>Start</th><th>Finish</th><th className="n">Hours</th><th className="n">Regular</th><th className="n">OT</th><th className="n">On jobs</th><th>Notes</th><th></th></tr></thead><tbody>
        {T.weeks.map(w=>(<React.Fragment key={w.start}>
          {w.days.map(x=>{const r=T.by.get(x),c=T.calc.days[x],fl=T.flags[x]||[],lv=fl.some(f=>f.lv==="bad")?"bad":fl.length?"warn":"",jh=T.jh[x]||0,lk=Tsh.lockedBy(s.payPeriods,e.id,x),acc=Tsh.dayAccess({date:x,today,locked:!!lk,role:canEdit?"owner":"staff"}),miss=!Tsh.isFilled(r)&&x<today&&Tsh.isWeekday(x),ed=Tsh.wasEdited(r);
            return(<React.Fragment key={x}><tr className={(x>today?"fut":c&&c.min?"":"off")+(x===today?" today":"")} data-date={x}>
              <td className="rc-tn">{Tsh.shortDate(x)}</td><td>{Tsh.dow(x)}</td><td>{r?r.start:""}</td><td>{r?r.finish:""}</td>
              <td className="n">{c&&c.min?fH(c.min):x>today?"":miss?<span className="rc-ts-miss">not filled in</span>:"—"}</td><td className="n">{c&&c.min?fH(c.regMin):""}</td><td className="n">{c&&c.otMin?fH(c.otMin):""}</td><td className="n">{jh?jh.toFixed(2):""}</td>
              <td className="nt">{r?<TsNote s={s} d={d} txt={r.notes}/>:null}</td>
              <td style={{whiteSpace:"nowrap"}}>{lv&&<button className={"rc-ts-flag "+lv} aria-expanded={open===x} title={fl.map(f=>f.msg).join(" ")} onClick={()=>setOpen(open===x?null:x)}>⚠ {fl.length}</button>}{ed&&<button className="rc-ts-flag info" aria-expanded={open===x} title="Filled in or changed after the day" onClick={()=>setOpen(open===x?null:x)}>edited</button>}{lk&&<span className="rc-ts-lock" title="In an approved pay period">🔒</span>}{acc.can&&<button className="rc-bs rc-ts-ed" aria-label={"Edit "+Tsh.shortDate(x)} onClick={()=>openDay(x)}>✎</button>}</td>
            </tr>{open===x&&<tr className="why"><td colSpan={10}>{fl.map((f,k)=>(<div key={k} className={"rc-ts-whyl "+f.lv}>{f.msg}</div>))}<TsHistory r={r}/></td></tr>}</React.Fragment>);})}
          <tr className="wk"><td colSpan={4}>Week of {Tsh.shortDate(w.start)} · {tsRule(w)}{w.outside.length?" · counts "+w.outside.length+" day"+(w.outside.length===1?"":"s")+" outside this period":""}<div className="rc-ts-dim">Over 8 a day: {fH(w.dailyMin)} · over 44 a week: {fH(w.weeklyMin)}</div></td><td className="n">{fH(w.min)}</td><td className="n">{fH(w.regMin)}</td><td className="n">{fH(w.otMin)}</td><td className="n">{w.job.toFixed(2)}</td><td colSpan={2}>Unallocated {w.unalloc.toFixed(2)} h</td></tr>
        </React.Fragment>))}
        <tr className="tot"><td colSpan={4}>Total · {Tsh.periodLabel(P)}</td><td className="n">{fH(T.tot.min)}</td><td className="n">{fH(T.tot.reg)}</td><td className="n">{fH(T.tot.ot)}</td><td className="n">{T.job.toFixed(2)}</td><td colSpan={2}>Unallocated {T.unalloc.toFixed(2)} h</td></tr>
      </tbody></table></div>
      {owner&&<div className="rc-ts-pay">
        <div><span className="rc-ml">Gross pay</span><b>{$$(T.pay.gross)}</b><span className="rc-ts-dim">before deductions (CPP, EI, tax)</span></div>
        <div className="rc-ts-dim">Regular {fH(T.pay.regMin)} h × {$$(+e.rate||0)} = {$$(T.pay.regPay)} · Overtime {fH(T.pay.otMin)} h × {$$((+e.rate||0)*ot)} ({ot}×) = {$$(T.pay.otPay)}</div>
        {!(+e.rate>0)&&<div className="rc-ts-errl">No pay rate for {e.name}. Add it on the Team tab.</div>}
      </div>}
      <div className="rc-ts-util">Paid {fH(T.tot.min)} h · on jobs {T.job.toFixed(2)} h · <b>unallocated {T.unalloc.toFixed(2)} h</b>{T.tot.min>0?" ("+Math.round(T.unalloc/(T.tot.min/60)*100)+"%)":""}. On jobs counts work-order time, diagnoses and ECM jobs logged under {e.nick||e.name}.{T.over.length>0&&<> More time on jobs than on the timesheet on {T.over.map(Tsh.shortDate).join(", ")}.</>}</div>
    </>)}
    {crew.length>1&&<><SH title={"Everyone · "+Tsh.periodLabel(P)}/><Tbl headers={["Employee","Hours","Regular","OT",...(owner?["Gross pay"]:[]),"Unallocated","Not filled in","Status"]}>{crew.map(({x,t})=>(<tr key={x.id}><td className="rc-tn"><button className="rc-lnk" onClick={()=>{setEmp(String(x.id));setOpen(null);}}>{x.name}</button></td><td>{fH(t.tot.min)}</td><td>{fH(t.tot.reg)}</td><td>{fH(t.tot.ot)}</td>{owner&&<td>{$$(t.pay.gross)}</td>}<td>{t.unalloc.toFixed(2)}</td><td style={{color:t.missing.length?"var(--w)":"var(--ft)"}}>{t.missing.length||"—"}</td><td>{t.appr?<span style={{color:"var(--g)",fontWeight:600}}>Approved</span>:<span style={{color:"var(--mt)"}}>Open</span>}</td></tr>))}</Tbl></>}
  </div>);
}

// The employee's own screen: this month, today first. Fill in today or fix an earlier day;
// days that haven't happened yet stay closed; an approved pay period locks its days.
function MyTimesheet({s,d,me,role="employee"}){
  const today=Tsh.shopToday(),cur=today.slice(0,7);
  const[ym,setYm]=useState(cur);
  const rows=tsRowsOf(s,me.id),by=new Map(rows.map(r=>[r.date,r])),calc=Tsh.computeDays(rows);
  const dates=Tsh.monthDays(ym),ds=dates.map(x=>calc.days[x]).filter(Boolean);
  const tot={min:ds.reduce((a,x)=>a+x.min,0),reg:ds.reduce((a,x)=>a+x.regMin,0),ot:ds.reduce((a,x)=>a+x.otMin,0)};
  const lockOf=x=>Tsh.lockedBy(s.payPeriods,me.id,x);
  const acc=x=>Tsh.dayAccess({date:x,today,locked:!!lockOf(x),role});
  const full=x=>{const r=by.get(x);tsSave(s,d,{emp:me.id,date:x,vals:{...Tsh.FULL_DAY,notes:r?r.notes||"":""},label:"Saved "+Tsh.shortDate(x)+": full day, 8.00 h"});};
  const edit=x=>d({type:"MODAL",v:"ts-day",d:{emp:me.id,date:x}});
  const tr=by.get(today),tc=calc.days[today],ta=acc(today),isFull=tr&&tr.start===Tsh.FULL_DAY.start&&tr.finish===Tsh.FULL_DAY.finish;
  const weeks=[...new Set(dates.map(Tsh.weekStart))];
  return(<div className="rc-my">
    {ym===cur&&<div className="rc-card rc-my-today">
      <div className="rc-my-th">Today</div><div className="rc-my-td">{Tsh.longDate(today)}</div>
      <div className="rc-my-tv">{tr&&tr.start?<><b>{tr.start} to {tr.finish}</b> · {fH(tc.min)} h{tc.otMin?" · "+fH(tc.otMin)+" overtime":""}</>:tr&&tr.notes?<b>{tr.notes}</b>:<span>Not filled in yet</span>}</div>
      {ta.can?<div className="rc-my-acts">{Tsh.isWeekday(today)&&!isFull&&<button className="rc-ba rc-my-full" onClick={()=>full(today)}>✓ Full day · 8:00 AM to 4:00 PM</button>}<button className="rc-bs" onClick={()=>edit(today)}>{Tsh.isFilled(tr)?"Change today":"Other times"}</button></div>:ta.why==="locked"?<div className="rc-ts-note">This pay period is approved, so today is locked.</div>:null}
      {!Tsh.isWeekday(today)&&!Tsh.isFilled(tr)&&ta.can&&<div className="rc-ts-dim">It's the weekend. If you worked today, tap Other times.</div>}
    </div>}
    <div className="rc-my-month">
      <button className="rc-bs" aria-label="Previous month" onClick={()=>setYm(Tsh.addMonths(ym,-1))}>‹</button>
      <div><b>{Tsh.monthLabel(ym)}</b><span>{fH(tot.min)} h · {fH(tot.reg)} regular · {fH(tot.ot)} overtime</span></div>
      <button className="rc-bs" aria-label="Next month" disabled={ym>=cur} onClick={()=>setYm(Tsh.addMonths(ym,1))}>›</button>
    </div>
    <div className="rc-card"><table className="rc-tbl rc-my-tbl"><thead><tr><th>Day</th><th>Times</th><th className="n">Hours</th><th></th></tr></thead><tbody>
      {weeks.map(w=>{const W=calc.weeks[w];return(<React.Fragment key={w}>
        {dates.filter(x=>Tsh.weekStart(x)===w).map(x=>{const r=by.get(x),c=calc.days[x],a=acc(x),lk=lockOf(x);return(<tr key={x} className={(x>today?"fut":"")+(x===today?" today":"")} data-date={x}>
          <td className="d"><b>{Tsh.dow(x)}</b> {Tsh.shortDate(x)}</td>
          <td>{r&&r.start?r.start+" to "+r.finish:x>today?"":<span className="rc-ts-dim">—</span>}{r&&r.notes?<div className="rc-my-note">{r.notes}</div>:null}</td>
          <td className="n">{c&&c.min?fH(c.min):""}{c&&c.otMin?<div className="rc-my-ot">{fH(c.otMin)} OT</div>:null}</td>
          <td className="act">{a.can?(<>{!Tsh.isFilled(r)&&Tsh.isWeekday(x)&&<button className="rc-bs rc-my-fd" onClick={()=>full(x)}>Full day</button>}<button className="rc-bs" onClick={()=>edit(x)}>{Tsh.isFilled(r)?"Edit":"Times"}</button></>):lk?<span className="rc-ts-lock" title="Approved: locked">🔒</span>:null}</td>
        </tr>);})}
        {W&&W.min>0&&<tr className="wk"><td colSpan={2}>Week of {Tsh.shortDate(w)}{W.rule==="weekly"?" · over 44 h":""}</td><td className="n">{fH(W.min)}{W.otMin?<div className="rc-my-ot">{fH(W.otMin)} OT</div>:null}</td><td/></tr>}
      </React.Fragment>);})}
    </tbody></table></div>
    <div className="rc-ts-dim rc-my-foot">Fill in today, or fix an earlier day if something's wrong. Days that haven't happened yet stay closed, days before {Tsh.monthLabel(Tsh.editFloor(today).slice(0,7))} can only be changed by the owner, and once a pay period is approved its days are locked. Lunch is paid, so a full day is 8:00 AM to 4:00 PM. Overtime is time over 8 hours in a day or 44 in a week.</div>
  </div>);
}

// What an employee login sees: their timesheet and nothing else. The owner gets the same
// screen through "See …'s screen", with a way back.
function EmployeeShell({s,d,me,email,preview,onExit,onSignOut,saveBadge,themePref,chooseTheme}){
  return(<div className="rc-emp">
    <header className="rc-emp-top">
      <div className="rc-logo"><div className="rc-hi">RC</div><div><div className="rc-hn">Rollin Coal</div><div className="rc-hs">My timesheet</div></div></div>
      <div className="rc-emp-who"><b>{me.name||email||""}</b>{saveBadge}
        <div className="rc-links">{preview?<button className="rc-fb on" onClick={onExit}>👁 {firstName(me.name)}'s screen · back to the dashboard</button>:<><button className="rc-link" onClick={()=>d({type:"MODAL",v:"my-password"})}>Password</button><button className="rc-link" onClick={onSignOut}>Sign out</button></>}</div>
      </div>
    </header>
    <main className="rc-emp-main">
      <MyTimesheet s={s} d={d} me={me}/>
      <div className="rc-seg rc-emp-theme" role="group" aria-label="Colour theme">{THEMES.map(([k,ic,l])=>(<button key={k} className={themePref===k?"on":""} aria-pressed={themePref===k} onClick={()=>chooseTheme(k)}><span aria-hidden="true">{ic}</span>{l}</button>))}</div>
    </main>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// REPORTS (enhanced with all new data)
// ═══════════════════════════════════════════════════════════════
function Reports({s,owner=true}){
  // Money before tax (GST/HST isn't revenue). The profit and loss covers a period, on the date of each invoice
  // and sale, with fixed costs for the same number of months (src/lib/money.js: Mny.pnl).
  const[per,setPer]=useState("month");const PP=Mny.periodFor(per);const pl=Mny.pnl(s,PP);
  const totalRev=(s.invoices||[]).filter(Mny.isPaid).reduce((a,inv)=>a+Mny.docSub(inv),0);
  const avgTkt=(s.invoices||[]).length>0?(s.invoices||[]).reduce((a,inv)=>a+Mny.docSub(inv),0)/s.invoices.length:0;
  const overhead=Mny.overheadMonthly(s.expenses);
  const payroll=Mny.payrollMonthly(s.employees);
  const pendRev=(s.invoices||[]).filter(i=>!Mny.isPaid(i)).reduce((a,inv)=>a+invTot(inv),0);
  const engSales=Mny.sales(s);const engRev=engSales.reduce((a,w)=>a+(+w.price||0),0);
  const totalFreight=(s.shipments||[]).reduce((a,sh)=>a+(+sh.freightCost||0),0);
  const coreDeposits=(s.cores||[]).filter(c=>c.status==="pending").reduce((a,c)=>a+(+c.deposit||0),0);
  const quoteConv=(s.quotes||[]).length>0?((s.quotes||[]).filter(q=>q.status==="approved").length/(s.quotes||[]).length*100):0;
  const catSales={};s.inventory.forEach(i=>{if(i.price>0&&!(isEngine(i)&&engStatus(i)==="sold"))catSales[i.cat]=(catSales[i.cat]||0)+i.price*(isEngine(i)?1:(i.qty||0));});
  const topCats=Object.entries(catSales).sort((a,b)=>b[1]-a[1]);const maxCat=topCats[0]?.[1]||1;
  const techLabor={};(s.timeEntries||[]).forEach(t=>{const k=t.tech||"Unassigned";if(!techLabor[k])techLabor[k]={hours:0,val:0};techLabor[k].hours+=(+t.hours||0);techLabor[k].val+=(+t.hours||0)*(+t.rate||0);});const techRows=Object.entries(techLabor).sort((a,b)=>b[1].val-a[1].val);const laborHrs=techRows.reduce((a,r)=>a+r[1].hours,0);const laborVal=techRows.reduce((a,r)=>a+r[1].val,0);
  // Top customers by what they've paid (their paid invoices), not a typed-in number.
  const topCusts=(s.customers||[]).map(c=>({...c,paid:Mny.custPaid(s,c.id)})).filter(c=>c.paid>0).sort((a,b)=>b.paid-a.paid).slice(0,5);
  const td=new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  return (<div>
    <div className="rc-print-header rc-print-only"><div><h1>Rollin Coal — Business Report</h1><div style={{fontSize:13,color:"#666",marginTop:4}}>Medicine Hat, AB · 1-587-863-0505</div></div><div className="rc-ph-sub"><div>{td}</div></div></div>
    <SH title="Business Report"><button className="rc-ba rc-noprint" onClick={()=>window.print()}>🖨 Print</button></SH>
    <div className="rc-g6">
      <Stat label="Collected" value={$K(totalRev)} sub="paid invoices, before tax"/><Stat label="Engine Sales" value={$K(engRev)} sub={engSales.length+(engSales.length===1?" engine sold":" engines sold")}/><Stat label="Owed to us" value={$K(pendRev)} sub="unpaid invoices"/><Stat label="Avg Invoice" value={$$(avgTkt)} sub="before tax"/>
      <Stat label="Quote Conversion" value={quoteConv.toFixed(0)+"%"}/><Stat label="Overhead/mo" value={$K(overhead)}/>{owner&&<Stat label="Payroll/mo" value={$K(payroll)}/>}
    </div>
    <div className="rc-g6">
      <Stat label="Freight Costs" value={$$(totalFreight)}/><Stat label="Core Deposits Pending" value={$$(coreDeposits)}/><Stat label="Active Warranties" value={(s.warranties||[]).filter(w=>w.status==="active").length}/>
      <Stat label="Open POs" value={(s.purchaseOrders||[]).filter(p=>p.status!=="received").length}/><Stat label="Engines Available" value={s.inventory.filter(i=>isEngine(i)&&engStatus(i)==="available").length}/><Stat label="Jobs Done" value={(s.jobs||[]).filter(j=>j.status==="complete").length}/>
    </div>
    {(()=>{const W=(s.wins||[]).filter(w=>w.kind==="sale");
      const big=W.reduce((a,w)=>!a||(+w.price||0)>(+a.price||0)?w:a,null);
      const bm=W.filter(w=>+w.cost>0&&+w.price>0).reduce((a,w)=>{const m=((+w.price)-(+w.cost))/(+w.price);return !a||m>a.m?{w,m}:a;},null);
      let fast=null;(s.inventory||[]).filter(isEngine).forEach(i=>{const v=velo(i);if(v.build!=null&&(!fast||v.build<fast.dd))fast={i,dd:v.build};});
      const mo={};W.forEach(w=>{const k=Mny.winDate(w).slice(0,7);mo[k]=mo[k]||{n:0,v:0};mo[k].n++;mo[k].v+=(+w.price||0);});
      let bmo=null;Object.entries(mo).forEach(([k,x])=>{if(!bmo||x.v>bmo.v)bmo={k,...x};});
      const P=(t,v,h)=>(<div style={{border:"1.4px solid color-mix(in srgb,var(--w) 35%,transparent)",background:"var(--ws)",borderRadius:13,padding:"13px 14px",textAlign:"center"}}><div className="rc-ml" style={{color:"var(--w)",marginBottom:5}}>🏆 {t}</div><div style={{fontFamily:"var(--fd)",fontWeight:900,fontSize:21,color:"var(--w)",lineHeight:1}}>{v}</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:5,minHeight:12}}>{h||""}</div></div>);
      return(<><SH title="Records Board"/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:20}}>
        {P("Biggest Sale",big?$K(+big.price):"—",big?big.name+" · "+Mny.winDate(big):"first sale sets it")}
        {P("Best Margin",bm?Math.round(bm.m*100)+"%":"—",bm?bm.w.name:"needs cost + sale")}
        {P("Fastest Reman",fast?Math.round(fast.dd)+"d":"—",fast?fast.i.name:"core → available")}
        {P("Best Month",bmo?$K(bmo.v):"—",bmo?bmo.k+" · "+bmo.n+" engine"+(bmo.n>1?"s":""):"")}
      </div></>);})()}
    {(()=>{const since=Date.now()-7*864e5;const inD=v=>v&&new Date(v.length<=10?v+"T12:00":v).getTime()>=since;
      const wW=(s.wins||[]).filter(w=>inD(w.ts));const wRev=wW.reduce((a,w)=>a+(+w.price||0),0);
      const wH=(s.timeEntries||[]).filter(t=>inD(t.date)).reduce((a,t)=>a+(+t.hours||0),0);
      const wP=(s.inventory||[]).filter(isEngine).reduce((a,i)=>a+(i.partsLog||[]).filter(p=>inD(p.date)).reduce((x,p)=>x+(+p.v||0),0),0);
      const wA=(s.activity||[]).filter(x=>inD(x.ts));const wAv=wA.filter(x=>/→ Available/.test(x.msg||"")).length;
      const C=(l,v)=>(<div className="rc-lm-c"><span className="rc-lm-l">{l}</span><span className="rc-lm-n">{v}</span></div>);
      return(<><SH title="This Week at the Shop"/><div className="rc-card" style={{padding:14,display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        {C("🏆 Sold",wW.length+" · "+$K(wRev))}{C("⏱ Wrenching",wH+"h")}{C("🧩 Parts into builds",$K(wP))}{C("🔧 Reman completed",wAv)}{C("📜 Actions logged",wA.length)}
      </div></>);})()}
    <div className="rc-card rc-pl">
      <div className="rc-pl-head"><div className="rc-pl-t">Profit & Loss</div><div className="rc-seg rc-noprint" role="group" aria-label="Period">{Mny.PERIODS.map(([k,l])=>(<button key={k} className={per===k?"on":""} aria-pressed={per===k} onClick={()=>setPer(k)}>{l}</button>))}</div></div>
      <div className="rc-pl-sub">{PP.from===PP.to?Tsh.monthLabel(PP.from):Tsh.monthLabel(PP.from)+" to "+Tsh.monthLabel(PP.to)} · on the date of each invoice and sale · before tax · {pl.months} month{pl.months===1?"":"s"} of fixed costs</div>
      {(()=>{const R=(l,v,c)=>(<div className="rc-pl-r"><span>{l}</span><span style={{color:c}}>{$$(v)}</span></div>);const T=(v,c)=>(<div className="rc-pl-r tot"><span>Total</span><span style={{color:c}}>{$$(v)}</span></div>);
        return(<div className="rc-pl-grid">
          <div><div className="rc-ml">Revenue</div>{R("Invoiced",pl.invoiced,"var(--g)")}{R("Engines sold without an invoice",pl.directSales,"var(--g)")}{T(pl.revenue,"var(--g)")}{pl.unpaid>0&&<div className="rc-pl-note">{$$(pl.unpaid)} of it still owed (with tax)</div>}{pl.taxCollected>0&&<div className="rc-pl-note">GST/HST collected for the government, not revenue: {$$(pl.taxCollected)}</div>}</div>
          <div><div className="rc-ml">Costs</div>{R("Engines sold ("+pl.engines+")",pl.cogs,"var(--r)")}{R("Freight",pl.freight,"var(--r)")}{R("Overhead",pl.overhead,"var(--r)")}{owner&&R("Payroll",pl.payroll,"var(--r)")}{T(pl.cogs+pl.freight+pl.overhead+(owner?pl.payroll:0),"var(--r)")}</div>
          <div>{owner?(<><div className="rc-ml">Net</div><div className="rc-pl-net" style={{color:pl.net>=0?"var(--g)":"var(--r)"}}>{$$(pl.net)}</div><div className="rc-pl-note">{pl.net>=0?"Profit":"Loss"} · gross margin {$$(pl.gross)}</div></>)
            :(<><div className="rc-ml">Gross margin</div><div className="rc-pl-net" style={{color:pl.gross>=0?"var(--g)":"var(--r)"}}>{$$(pl.gross)}</div><div className="rc-pl-note">Revenue less the engines' cost and freight. Net profit shows on the owner's login.</div></>)}</div>
        </div>);})()}
      <div className="rc-pl-foot">An engine's cost is its cost basis when it sold, less the shop's own labour logged into it, which payroll already covers. Expenses count by how often they're paid{owner?"; payroll is each person's weekly hours × pay rate":""}.</div>
    </div>
    <div className="rc-2col">
      <div><SH title="Velocity by Make"/><div className="rc-card" style={{padding:16}}>
        {(()=>{const rows={};s.inventory.filter(isEngine).forEach(i=>{const v=velo(i);if(v.build==null&&v.sell==null)return;const mk=(i.name||"?").split(" ")[0];rows[mk]=rows[mk]||{b:[],s:[]};if(v.build!=null)rows[mk].b.push(v.build);if(v.sell!=null)rows[mk].s.push(v.sell);});const ent=Object.entries(rows);if(!ent.length)return <div style={{fontSize:13,color:"var(--mt)"}}>Tracking just started — build speed (core → available) and sell speed (available → sold) fill in per make as engines move from here on. This is your buy-more / stop-buying signal.</div>;const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;return ent.map(([mk,v],x)=>(<div key={x} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--ln2)",fontSize:14}}><span style={{fontFamily:"var(--fd)",fontWeight:600}}>{mk}</span><span style={{color:"var(--tx2)",fontSize:13}}>build {avg(v.b)!=null?avg(v.b)+"d ("+v.b.length+")":"—"} · sell {avg(v.s)!=null?avg(v.s)+"d ("+v.s.length+")":"—"}</span></div>));})()}
      </div></div>
      <div><SH title="Lot Aging"/><div className="rc-card" style={{padding:16}}>
        {(()=>{const E=s.inventory.filter(isEngine);const now=Date.now();const av=E.filter(i=>engStatus(i)==="available"&&i.stageDate).map(i=>({i,dl:Math.floor((now-new Date(i.stageDate).getTime())/864e5)})).sort((a,b)=>b.dl-a.dl).slice(0,5);const oldCores=E.filter(i=>engStatus(i)==="core"&&i.stageDate&&(now-new Date(i.stageDate).getTime())>30*864e5).length;return(<>{av.length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:6}}>No listing-age data yet — fills in as engines hit Available from here on. Dead iron is dead cash: 60d suggests −5%, 90d suggests −10%.</div>):av.map(({i,dl},x)=>(<div key={x} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"4px 0",borderBottom:"1px solid var(--ln2)",fontSize:13}}><span style={{flex:1,minWidth:0}}>{i.name}</span><span style={{color:dl>=60?"var(--w)":"var(--tx2)",flexShrink:0}}>{dl}d{dl>=90?" · −10%?":dl>=60?" · −5%?":""}</span></div>))}{oldCores>0&&<div className="rc-gap" style={{marginTop:6}}>🧊 {oldCores} core{oldCores>1?"s":""} untouched 30+ days — schedule the reman or flip as-is</div>}</>);})()}
      </div></div>
    </div>
    {(s.wins||[]).length>0&&<><SH title="Sales by Source"/><div className="rc-card" style={{padding:16,display:"flex",gap:10,flexWrap:"wrap"}}>{(()=>{const g={};(s.wins||[]).forEach(w=>{const k=w.src||"untagged";g[k]=g[k]||{n:0,v:0};g[k].n++;g[k].v+=(+w.price||0);});return Object.entries(g).sort((a,b)=>b[1].v-a[1].v).map(([k,v],x)=>(<div key={x} className="rc-lm-c"><span className="rc-lm-l">{k==="untagged"?"Not tagged":srcLabel(k)}</span><span className="rc-lm-n">{v.n} · {$K(v.v)}</span></div>));})()}</div></>}
    <div className="rc-2col">
      {topCats.length>0&&<div><SH title="Inventory by Category"/><div className="rc-card" style={{padding:16}}>{topCats.map(([cat,val],i)=>(<div key={i} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:4}}><span style={{fontFamily:"var(--fd)",fontWeight:600}}>{cat}</span><span style={{color:"var(--act)",fontWeight:600}}>{$K(val)}</span></div><div style={{height:6,background:"var(--sf2)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(val/maxCat)*100}%`,background:"var(--ac)",borderRadius:3}}/></div></div>))}</div></div>}
      {topCusts.length>0&&<div><SH title="Top Customers"/><Tbl headers={["#","Customer","Type","Paid"]}>{topCusts.map((c,i)=>(<tr key={c.id}><td style={{fontFamily:"var(--fd)",fontWeight:700,color:i===0?"var(--act)":"var(--mt)"}}>{i+1}</td><td className="rc-tn">{c.name}</td><td style={{fontSize:13,color:"var(--tx2)"}}>{c.type}</td><td style={{color:"var(--act)",fontWeight:600}}>{$K(c.paid)}</td></tr>))}</Tbl></div>}
    </div>
    {(()=>{const st=svcStats(s);const rows=Object.entries(st).map(([k,v])=>({k,sv:k==="other"?null:svcById(s,k),...v})).filter(r=>r.n>0).sort((a,b)=>b.charged-a.charged);if(!rows.length)return null;const T=rows.reduce((a,r)=>({n:a.n+r.n,charged:a.charged+r.charged,hours:a.hours+r.hours,cost:a.cost+r.cost}),{n:0,charged:0,hours:0,cost:0});const sold=(s.inventory||[]).filter(i=>isEngine(i)&&engStatus(i)==="sold");const withSvc=sold.filter(e=>(s.jobs||[]).some(j=>+j.engineId===e.id&&jobKind(j)==="service"));
      return(<><SH title="Services"/><div className="rc-g4"><Stat label="Charged for services" value={$K(T.charged)} sub={T.n+" job"+(T.n===1?"":"s")}/><Stat label="Labour cost" value={$K(T.cost)} sub={Math.round(T.hours*10)/10+"h logged"}/><Stat label="Labour profit" value={$K(T.charged-T.cost)} sub={T.charged>0?Math.round((T.charged-T.cost)/T.charged*100)+"% of charges":""}/><Stat label="Engines sold with a service" value={withSvc.length+" of "+sold.length}/></div>
      <Tbl headers={["Service","Done","Charged","Hours","Labour cost","Labour profit"]}>{rows.map(r=>(<tr key={r.k}><td className="rc-tn">{r.sv?r.sv.name:r.k==="other"?"Other work (no service picked)":(r.name||"Removed service")}</td><td>{r.n}</td><td style={{fontWeight:600}}>{$$(r.charged)}</td><td>{Math.round(r.hours*10)/10}h</td><td>{$$(r.cost)}</td><td style={{color:r.charged-r.cost<0?"var(--r)":"var(--g)",fontWeight:600}}>{$$(r.charged-r.cost)}</td></tr>))}</Tbl></>);})()}
    {(()=>{const all=s.ecmJobs||[];if(!all.length)return null;const done=all.filter(j=>j.status==="complete");const paid=all.filter(j=>j.billTo!=="warranty"&&(j.status==="complete"||ecmInv(s,j)));const rev=paid.reduce((a,j)=>a+ecmCharge(s,j),0);
      const byT=ECM_TYPES.map(([k,l])=>{const js=done.filter(j=>(j.types||[]).includes(k));const r=paid.reduce((a,j)=>a+(ecmTypeShares(s,j)[k]||0),0);const cb=js.filter(j=>truthy(j.comeback)).length;return{k,l,n:js.length,r,cb};}).filter(x=>x.n||x.r);
      const byM={};done.forEach(j=>{const m=(j.completedAt||j.date||"").slice(0,7);if(!m)return;byM[m]=byM[m]||{n:0,r:0};byM[m].n++;byM[m].r+=ecmCharge(s,j);});const months=Object.keys(byM).sort().reverse().slice(0,12);
      // Fuel economy is L/100 km: a negative change is better. Only jobs with a baseline AND that follow-up count.
      const fuelBy=keyOf=>{const o={};all.forEach(j=>{const b=+(j.trip||{}).fuel;if(!(b>0))return;[30,60,90].forEach(n=>{const a=+(((j.fu||{})[n])||{}).fuel;if(!(a>0))return;keyOf(j).forEach(k=>{o[k]=o[k]||{30:[],60:[],90:[]};o[k][n].push((a-b)/b*100);});});});return o;};
      const fFam=fuelBy(j=>[j.family||"?"]);const fType=fuelBy(j=>(j.types||[]).length?j.types:["?"]);
      const cell=a=>{if(!a||!a.length)return <span style={{color:"var(--mt)"}}>—</span>;const v=a.reduce((x,y)=>x+y,0)/a.length;return(<span style={{color:v<=0?"var(--g)":"var(--r)",fontWeight:600}}>{v>0?"+":""}{v.toFixed(1)}%<span style={{color:"var(--mt)",fontWeight:400,fontSize:12.5}}> · {a.length} job{a.length===1?"":"s"}</span></span>);};
      const dyno={};all.forEach(j=>{const b=j.dynoB||{},a=j.dynoA||{};if(!(+b.hp>0&&+a.hp>0))return;const k=j.family||"?";dyno[k]=dyno[k]||{n:0,hp:0,tq:0,tqn:0};dyno[k].n++;dyno[k].hp+=+a.hp-+b.hp;if(+b.tq>0&&+a.tq>0){dyno[k].tq+=+a.tq-+b.tq;dyno[k].tqn++;}});
      const codes={};all.forEach(j=>(j.bFaults||[]).forEach(f0=>{const c=String(f0.code||"").trim().toUpperCase();if(!c)return;const k=j.family||"?";codes[k]=codes[k]||{};const e=codes[k][c]=codes[k][c]||{n:0,d:""};e.n++;if(!e.d&&f0.desc)e.d=f0.desc;}));
      const cbAll=done.filter(j=>truthy(j.comeback)).length;const sg=v=>(v>0?"+":"")+v;
      return(<><SH title="ECM Programming"/>
        <div className="rc-g4"><Stat label="ECM jobs completed" value={done.length} sub={(all.length-done.length)+" open"}/><Stat label="ECM revenue" value={$K(rev)} sub="customer-paid, completed or billed"/><Stat label="Comeback rate" value={done.length?Math.round(cbAll/done.length*100)+"%":"—"} sub={cbAll+" of "+done.length+" completed"}/><Stat label="On hold: emissions" value={all.filter(j=>j.status==="on-hold"&&j.holdReason==="emissions").length}/></div>
        {byT.length>0&&<Tbl headers={["Job type","Completed","Service revenue","Comebacks"]}>{byT.map(x=>(<tr key={x.k}><td className="rc-tn">{x.l}</td><td>{x.n}</td><td style={{fontWeight:600}}>{$$(x.r)}</td><td>{x.n?Math.round(x.cb/x.n*100)+"% · "+x.cb:"—"}</td></tr>))}</Tbl>}
        {months.length>0&&<Tbl headers={["Month","ECM jobs completed","Revenue"]}>{months.map(m=>(<tr key={m}><td className="rc-tn">{m}</td><td>{byM[m].n}</td><td style={{fontWeight:600}}>{$$(byM[m].r)}</td></tr>))}</Tbl>}
        {Object.keys(fFam).length>0&&<><div className="rc-ecm-rh">Fuel economy change after the job, L/100 km, so lower is better. Only jobs with a baseline and that follow-up count.</div>
          <Tbl headers={["Engine family","30 days","60 days","90 days"]}>{Object.keys(fFam).sort().map(k=>(<tr key={k}><td className="rc-tn">{ecmFamLabel(k)}</td><td>{cell(fFam[k][30])}</td><td>{cell(fFam[k][60])}</td><td>{cell(fFam[k][90])}</td></tr>))}</Tbl>
          <Tbl headers={["Job type","30 days","60 days","90 days"]}>{Object.keys(fType).map(k=>(<tr key={k}><td className="rc-tn">{k==="?"?"No type set":ecmTypeLabel(k)}</td><td>{cell(fType[k][30])}</td><td>{cell(fType[k][60])}</td><td>{cell(fType[k][90])}</td></tr>))}</Tbl></>}
        {Object.keys(dyno).length>0&&<Tbl headers={["Engine family","Before and after dynos","Average HP gain","Average torque gain"]}>{Object.keys(dyno).sort().map(k=>{const x=dyno[k];return(<tr key={k}><td className="rc-tn">{ecmFamLabel(k)}</td><td>{x.n}</td><td style={{fontWeight:600}}>{sg(Math.round(x.hp/x.n*10)/10)} HP</td><td>{x.tqn?sg(Math.round(x.tq/x.tqn))+" lb-ft":"—"}</td></tr>);})}</Tbl>}
        {Object.keys(codes).length>0&&<Tbl headers={["Engine family","Most common fault codes at intake"]}>{Object.keys(codes).sort().map(k=>(<tr key={k}><td className="rc-tn" style={{verticalAlign:"top"}}>{ecmFamLabel(k)}</td><td style={{fontSize:13.5}}>{Object.entries(codes[k]).sort((a,b)=>b[1].n-a[1].n).slice(0,5).map(([c,v])=>(<div key={c}><b>{c}</b>{v.d?" · "+v.d:""} <span style={{color:"var(--mt)"}}>×{v.n}</span></div>))}</td></tr>))}</Tbl>}
      </>);})()}
    {(()=>{const P=s.prospects||[],Cm=s.competitors||[];if(!P.length&&!Cm.length)return null;const both=[...P,...Cm];
      const regs=[...new Set(P.map(r=>r.region||"—"))].sort();const pv=(reg,k)=>P.filter(r=>(r.region||"—")===reg&&(r.status||"")===k).length;
      // Week of = the Monday. Visits per week across fleets and shops, last 8 weeks.
      const wkOf=iso=>{const dt=new Date(iso+"T12:00:00");dt.setDate(dt.getDate()-((dt.getDay()+6)%7));return dt.toISOString().slice(0,10);};
      const weeks=[];for(let x=0;x<8;x++)weeks.push(wkOf(addDays(isoToday(),-7*x)));
      const vc={},cc={};both.forEach(r=>(r.log||[]).forEach(e=>{if(!e.date)return;const w=wkOf(e.date);if(e.type==="visit")vc[w]=(vc[w]||0)+1;else if(e.type==="call"||e.type==="email")cc[w]=(cc[w]||0)+1;}));
      const touched=both.filter(r=>(r.log||[]).some(e=>e.type!=="note")||(r.status||"")!=="");const conv=both.filter(r=>r.status==="customer"||r.customerId);
      const cids=new Set(conv.map(r=>+r.customerId).filter(Boolean));const rev=(s.invoices||[]).filter(v=>cids.has(+v.custId)).reduce((a,v)=>a+invTot(v),0);
      const cats=[...new Set(Cm.map(r=>r.category||"—"))].sort();const cregs=[...new Set(Cm.map(r=>r.region||"—"))].sort();
      return(<>
        {P.length>0&&<><SH title="Prospect Pipeline"/>
          <div className="rc-g4"><Stat label="Fleets" value={P.length} sub={P.filter(r=>!(r.status||"")).length+" not contacted yet"}/><Stat label="Contacted" value={touched.length} sub="fleets and shops"/><Stat label="Visited to customer" value={touched.length?Math.round(conv.length/touched.length*100)+"%":"—"} sub={conv.length+" became customers"}/><Stat label="Revenue from converted" value={$K(rev)} sub="their invoices, with tax"/></div>
          <div className="rc-card"><table className="rc-tbl rc-tbl-wrap"><thead><tr>{["Region",...PST.map(x=>x[1]),"Total"].map(h=>(<th key={h}>{h}</th>))}</tr></thead><tbody>{regs.map(rg=>(<tr key={rg}><td className="rc-tn">{rg}</td>{PST.map(([k])=>{const n=pv(rg,k);return(<td key={k||"new"} style={{color:n?"var(--tx)":"var(--ft)"}}>{n||"—"}</td>);})}<td style={{fontWeight:600}}>{P.filter(r=>(r.region||"—")===rg).length}</td></tr>))}</tbody></table></div>
          <Tbl headers={["Week of","Visits","Calls and emails"]}>{weeks.map(w=>(<tr key={w}><td className="rc-tn">{w}</td><td>{vc[w]||0}</td><td>{cc[w]||0}</td></tr>))}</Tbl></>}
        {Cm.length>0&&<><SH title="Competitors by Region"/><Tbl headers={["Category",...cregs,"Total"]}>{cats.map(c=>(<tr key={c}><td className="rc-tn">{c}</td>{cregs.map(rg=>{const n=Cm.filter(r=>(r.category||"—")===c&&(r.region||"—")===rg).length;return(<td key={rg} style={{color:n?"var(--tx)":"var(--ft)"}}>{n||"—"}</td>);})}<td style={{fontWeight:600}}>{Cm.filter(r=>(r.category||"—")===c).length}</td></tr>))}<tr><td className="rc-tn">Total</td>{cregs.map(rg=>(<td key={rg} style={{fontWeight:600}}>{Cm.filter(r=>(r.region||"—")===rg).length}</td>))}<td style={{fontWeight:700}}>{Cm.length}</td></tr></Tbl></>}
      </>);})()}
    {(s.timesheets||[]).length>0&&(()=>{
      // Timesheets: hours and overtime per person per month (last 6 months with days), labour cost (owner only), unallocated hours by week.
      const per=(s.employees||[]).filter(e=>(s.timesheets||[]).some(r=>String(r.emp)===String(e.id))).map(e=>({e,c:Tsh.computeDays(tsRowsOf(s,e.id)),jh:tsJobHours(s,e),pf:tsPayFor(s,e)}));
      const months=[...new Set((s.timesheets||[]).map(r=>String(r.date).slice(0,7)))].sort().reverse().slice(0,6);
      const rows=[];per.forEach(({e,c,jh,pf})=>months.forEach(m=>{const ds=Object.values(c.days).filter(x=>x.date.startsWith(m));if(!ds.length)return;const pay=Tsh.payTotals(ds,pf);rows.push({e,m,min:ds.reduce((a,x)=>a+x.min,0),reg:pay.regMin,ot:pay.otMin,gross:pay.gross,missing:pay.missing.length>0,job:tsJobIn(jh,m+"-01",Tsh.monthEnd(m)),un:ds.reduce((a,x)=>a+Math.max(0,x.min/60-(jh[x.date]||0)),0)});}));
      const wk0=Tsh.weekStart(isoToday());const wrow=[7,6,5,4,3,2,1,0].map(k=>{const w=Tsh.addDaysISO(wk0,-7*k),end=Tsh.addDaysISO(w,6);let paid=0,job=0,un=0;per.forEach(({c,jh})=>{Object.values(c.days).filter(x=>x.date>=w&&x.date<=end).forEach(x=>{paid+=x.min/60;un+=Math.max(0,x.min/60-(jh[x.date]||0));});job+=tsJobIn(jh,w,end);});return{w,paid,job,un};});
      const top=Math.max(1,...wrow.map(x=>x.un));
      return(<><SH title="Timesheets"/>
        <Tbl headers={["Employee","Month","Hours","Regular","OT",...(owner?["Labour cost"]:[]),"On jobs","Unallocated"]}>{rows.map(r=>(<tr key={r.e.id+"-"+r.m}><td className="rc-tn">{r.e.name}</td><td>{Tsh.monthLabel(r.m)}</td><td>{fH(r.min)}</td><td>{fH(r.reg)}</td><td style={{color:r.ot?"var(--w)":"var(--ft)"}}>{fH(r.ot)}</td>{owner&&<td style={{fontWeight:600}}>{$$(r.gross)}{r.missing?" *":""}</td>}<td>{r.job.toFixed(2)}</td><td>{r.un.toFixed(2)}</td></tr>))}</Tbl>
        {owner&&rows.some(r=>r.missing)&&<div className="rc-ts-dim" style={{margin:"-8px 0 16px"}}>* No wage on file for part of that month, so those hours are left out of the labour cost.</div>}
        <SH title="Unallocated Hours by Week"/>
        <Tbl headers={["Week of","Paid","On jobs","Unallocated",""]}>{wrow.map(x=>(<tr key={x.w}><td className="rc-tn">{Tsh.shortDate(x.w)}</td><td>{x.paid.toFixed(2)}</td><td>{x.job.toFixed(2)}</td><td>{x.un.toFixed(2)}{x.paid>0?" ("+Math.round(x.un/x.paid*100)+"%)":""}</td><td style={{width:"34%"}}><div className="rc-ts-meter"><span style={{width:(x.un/top*100)+"%"}}/></div></td></tr>))}</Tbl>
      </>);})()}
    {techRows.length>0&&<><SH title="Labor by Technician"/><div className="rc-card" style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--mt)",marginBottom:10}}><span>{laborHrs}h logged</span>{owner&&<span style={{color:"var(--act)",fontWeight:600}}>{$$(laborVal)} labour cost at tech pay</span>}</div>{techRows.map(([tech,v],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<techRows.length-1?"1px solid var(--ln)":"none",fontSize:14}}><span style={{fontFamily:"var(--fd)",fontWeight:600}}>{tech}</span><span style={{display:"flex",gap:16,alignItems:"center"}}><span style={{color:"var(--tx2)"}}>{v.hours}h</span>{owner&&<span style={{color:"var(--act)",fontWeight:600,width:80,textAlign:"right"}}>{$$(v.val)}</span>}</span></div>))}</div></>}
    <div className="rc-print-only" style={{marginTop:24,paddingTop:10,borderTop:"2px solid #ccc",fontSize:12,color:"#999",display:"flex",justifyContent:"space-between"}}><span>Rollin Coal — Confidential</span><span>{td}</span></div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MODAL SYSTEM (all modals — add/edit/detail)
// ═══════════════════════════════════════════════════════════════
// who.role: "owner", "staff" or "employee" (an employee login, or the owner previewing one).
function Modals({s,d,owner=true,who={role:"owner"}}){
  const sRef2=useRef(s);sRef2.current=s;
  const logins=useLogins(owner);
  const[f,sf]=useState({});const[lines,setLines]=useState([{d:"",q:1,r:0}]);const[ptab,setPtab]=useState("overview");const[qrPrev,setQrPrev]=useState("");
  useEffect(()=>{const one=s.modal==="qr-tags"&&s.md&&s.md.ids&&s.md.ids.length===1?s.md.ids[0]:null;if(one==null){setQrPrev("");return;}let on=true;qrSvg(engineUrl(one)).then(v=>{if(on)setQrPrev(v);},()=>{});return()=>{on=false;};},[s.modal,s.md]);
  const lastEng=useRef(null);const[etab,setEtab]=useState("intake");const lastEcm=useRef(null);const[uploading,setUploading]=useState(false);
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  useEffect(()=>{if(!s.modal){lastEng.current=null;lastEcm.current=null;}
    // Reset the form for the modal first; the per-modal prefills below merge on top of it.
    if(s.modal&&s.modal.startsWith("edit-")&&s.md){const item={...s.md};if(Array.isArray(item.vehicles))item.vehicles=item.vehicles.join(", ");if(Array.isArray(item.tags))item.tags=item.tags.join(", ");if(Array.isArray(item.specialties))item.specialties=item.specialties.join(", ");if(Array.isArray(item.certs))item.certs=item.certs.join(", ");if(Array.isArray(item.models))item.models=item.models.join(", ");Object.keys(item).forEach(k=>{if(k!=="id"&&!/Id$/.test(k)&&typeof item[k]==="number")item[k]=String(item[k]);});sf(item);}else{const m=s.md||{};sf({...(m.cat?{cat:m.cat}:{}),...(m.status?{status:m.status}:{}),...(m.custId?{custId:+m.custId||m.custId}:{}),...(m.engineId?{engineId:m.engineId,engineName:m.engineName}:{}),...(m.prefill||{})});}
    if(s.modal==="emp-login")sf(pp=>({...pp,lgPass:makePassword(),lgRole:"employee"}));
    // An engine with only a flat cost shows it as the Core Purchase, so adding freight adds to it.
    if(s.modal==="edit-part"&&s.md&&isEngine(s.md)&&!(+s.md.costCore)&&+s.md.cost>0)sf(pp=>({...pp,costCore:String(s.md.cost)}));
    if(s.modal==="add-expense")sf(pp=>({...pp,freq:pp.freq||"monthly"}));if(s.modal==="add-cust")sf(pp=>({...pp,type:pp.type||"Individual"}));if(s.modal==="edit-cust"&&s.md&&Mny.provName(s.md.province))sf(pp=>({...pp,province:Mny.provName(s.md.province)}));if(s.modal==="edit-expense"&&s.md)sf(pp=>({...pp,freq:Mny.freqKey(s.md.freq)}));
    if(s.modal==="bom-note"&&s.md){const e0=(sRef2.current.inventory||[]).find(x=>x.id===+s.md.engineId);const sh0=(sRef2.current.bomSheets||[]).find(x=>+x.engineId===+((e0&&e0.id)||0));const r0=((sh0&&sh0.rows)||{})[s.md.lineId]||{};sf(pp=>({...pp,bnMeas:r0.meas||"",bnPn:r0.pn||"",bnUrl:r0.url||""}));}if(s.modal==="edit-bom"&&s.md){const b0=s.md;sf(pp=>({...pp,bmLabel:b0.label||"",bmFamily:b0.family||"",bmModel:b0.model||"",bmMatch:(b0.match||[]).join(", "),bmRev:b0.rev||"",bmNote:b0.note||"",bmWatch:b0.watch||"",bmRule:b0.rule||""}));}if(s.modal==="add-bom"&&s.md&&s.md.cloneOf){const b1=(sRef2.current.boms||[]).find(x=>x.id===+s.md.cloneOf);if(b1)sf(pp=>({...pp,bmLabel:"",bmFamily:"",bmModel:"",bmMatch:"",bmRev:b1.rev||"1.0",bmNote:b1.note||""}));}if(s.modal==="add-bomline"&&s.md){const k0=s.md.kind||"decide";sf(pp=>({...pp,blSec:s.md.sec||"",blQty:k0==="order"?"1":"",blPart:"",blNote:"",blKind:k0,blMach:false}));}if(s.modal==="edit-bomline"&&s.md){const l0=s.md;sf(pp=>({...pp,blSec:l0.sec||"",blQty:l0.qty||"1",blPart:l0.part||"",blNote:l0.note||"",blKind:lineKind(l0),blMach:!!l0.mach}));}if(s.modal==="bom-sheet"&&s.md){const sh1=(sRef2.current.bomSheets||[]).find(x=>+x.engineId===+s.md.engineId);if(sh1)sf(pp=>({...pp,bsWo:sh1.wo||"",bsTech:sh1.tech||"",bsDate:sh1.date||"",bsDone:sh1.dateDone||"",bsCore:sh1.coreSource||"",bsNotes:sh1.notes||""}));}if(s.modal==="part-detail"){const eid=s.md&&s.md.id;if(s.md&&s.md.ptab)setPtab(s.md.ptab);else if(eid!==lastEng.current)setPtab("overview");lastEng.current=eid;}if(s.modal==="ecm-job"){const eid=s.md&&s.md.id;if(s.md&&s.md.etab)setEtab(s.md.etab);else if(eid!==lastEcm.current)setEtab("intake");lastEcm.current=eid;}setLines(s.md&&Array.isArray(s.md.prefillItems)&&s.md.prefillItems.length?s.md.prefillItems:[{d:"",q:1,r:0}]);},[s.modal]);
  if(!s.modal)return null;
  const W=(ch,cls)=>(<div className={"rc-ov"+(cls?" "+cls:"")} onClick={()=>d({type:"CLOSE"})}><div className="rc-mod" role="dialog" aria-modal="true" tabIndex={-1} onClick={e=>e.stopPropagation()}>{(s.mstack||[]).length>0&&<button className="rc-fb" onClick={()=>d({type:"BACK"})} style={{marginBottom:10}}>← Back</button>}{ch}</div></div>);
  const DATEKEYS=["date","dueDate","shipDate","estDelivery","expiryDate","startDate","orderDate","eta","followUp"];
  const F=(k,l,t)=>(<div className="rc-fg"><label className="rc-fl" htmlFor={"f-"+k}>{l}</label>{Array.isArray(t)?(<select id={"f-"+k} className="rc-fi" value={f[k]==null?"":String(f[k])} onChange={e=>set(k,e.target.value)} style={{appearance:"none"}}>{[...t,...(f[k]&&!t.some(([v])=>String(v)===String(f[k]))?[[f[k],f[k]]]:[])].map(([v,lb])=>(<option key={v} value={v}>{lb}</option>))}</select>):(<input id={"f-"+k} className="rc-fi" value={f[k]||""} onChange={e=>set(k,e.target.value)} placeholder={l} type={t||(DATEKEYS.includes(k)?"date":/phone$/i.test(k)?"tel":/email$/i.test(k)?"email":"text")}/>)}</div>);
  const CS=allowNew=>(<div className="rc-fg"><label className="rc-fl" htmlFor="f-custId">Customer</label><select id="f-custId" className="rc-fi" value={f.custId||""} onChange={e=>{const v=e.target.value;set("custId",v==="new"?"new":v?+v:"");}} style={{appearance:"none"}}><option value="">Select...</option>{(s.customers||[]).map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}{allowNew&&<option value="new">+ New customer…</option>}</select>
    {allowNew&&f.custId==="new"&&<input className="rc-fi" style={{marginTop:6}} aria-label="New customer's name" placeholder="New customer's name (add the rest later)" value={f.newCust||""} onChange={e=>set("newCust",e.target.value)}/>}</div>);
  // The customer a form picked, made first when it's a new one (the form stays open while it's added).
  const custFor=()=>{if(f.custId!=="new")return +f.custId||0;const cid=Date.now()+7;d({type:"ADD",list:"customers",d:{id:cid,name:(f.newCust||"").trim(),type:"Individual",phone:"",email:"",province:"",vehicles:[],notes:"",tags:[],visits:0,last:isoToday()},keep:true,label:"Customer added"});return cid;};
  const custWhy=()=>!f.custId?"Pick a customer.":f.custId==="new"&&!(f.newCust||"").trim()?"Type the new customer's name.":"";
  const ES=(auto,lab)=>(<div className="rc-fg"><label className="rc-fl">{lab||"Engine (optional)"}</label><select className="rc-fi" value={f.engineId||""} onChange={e=>{const id=+e.target.value;const eng=(s.inventory||[]).find(x=>x.id===id);set("engineId",e.target.value?id:"");if(eng&&auto)auto(eng);}} style={{appearance:"none"}}><option value="">Not linked</option>{(s.inventory||[]).filter(isEngine).map(eng=>(<option key={eng.id} value={eng.id}>{eng.name} {eng.serial?`· ESN ${eng.serial}`:""}</option>))}</select></div>);
  // Sales tax on an invoice or quote: the customer's province decides until someone picks a rate.
  const custOf=()=>(s.customers||[]).find(c=>sameId(c.id,f.custId));
  const taxPick=()=>f.taxRate!=null&&f.taxRate!==""?+f.taxRate:Mny.taxForProv((custOf()||{}).province);
  const TAXSEL=rate=>{const c=custOf();return(<div className="rc-fg"><label className="rc-fl" htmlFor="f-taxRate">Sales tax</label><select id="f-taxRate" className="rc-fi" value={String(rate)} onChange={e=>set("taxRate",e.target.value)} style={{appearance:"none"}}>{Mny.TAX_OPTS.map(([v,l])=>(<option key={v} value={String(v)}>{l}</option>))}{!Mny.TAX_OPTS.some(([v])=>v===rate)&&<option value={String(rate)}>{Mny.taxName({taxRate:rate})}</option>}</select>{(f.taxRate==null||f.taxRate==="")&&c&&c.province?<div className="rc-hint">From {c.name}'s province: {c.province}</div>:null}</div>);};
  const TERMS=["Due on receipt","Net 7","Net 15","Net 30","Net 45","Net 60"];
  const CUST_TYPES=[["Individual","Individual"],["Fleet","Fleet"],["Business","Business"]];const PROV_OPTS=[["","—"],...Mny.PROVINCE_NAMES.map(([,n])=>[n,n])];
  const TERMSEL=()=>{const v=f.due||"Net 30";return(<div className="rc-fg"><label className="rc-fl" htmlFor="f-due">Terms</label><select id="f-due" className="rc-fi" value={v} onChange={e=>set("due",e.target.value)} style={{appearance:"none"}}>{[...TERMS,...(TERMS.includes(v)?[]:[v])].map(t=>(<option key={t} value={t}>{t}</option>))}</select><div className="rc-hint">Due {Mny.dueDateOf({date:f.date||isoToday(),due:v})}</div></div>);};
  const TOT=doc=>(<div className="rc-tot">Subtotal {$$(Mny.docSub(doc))} · {Mny.taxName(doc)} {$$(Mny.docTax(doc))} · <strong>Total {$$(Mny.docTotal(doc))}</strong></div>);
  // Why the main button is greyed out, instead of a button that silently does nothing.
  const lineWhy=()=>{const bad=Mny.blankLines(lines);return !Mny.usedLines(lines).length?"Add a line with a description.":bad.length?"Line "+bad.join(", ")+" has an amount but no description.":"";};
  const WHY=w=>w?<div className="rc-why" role="status">{w}</div>:null;
  const TS=()=>(<div className="rc-fg"><label className="rc-fl">Technician</label><select className="rc-fi" value={f.tech||""} onChange={e=>set("tech",e.target.value)} style={{appearance:"none"}}><option value="">Unassigned</option>{(s.employees||[]).filter(e=>e.status==="active").map(e=>(<option key={e.id} value={e.nick||e.name}>{e.name}</option>))}</select></div>);
  // A replaced or removed photo's file goes 20 s later, and only if no engine or part still uses it (a cancelled edit,
  // or a save that didn't land, keeps the picture).
  const dropPhotoLater=u=>{if(!u)return;setTimeout(()=>{const st=sRef2.current||{};if(![...(st.inventory||[]),...(st.parts||[])].some(x=>x&&x.photo===u))deletePhoto(u);},20000);};
  const PH=()=>(<div className="rc-fg"><label className="rc-fl">Photo</label>{f.photo?(<div style={{position:"relative",marginBottom:6}}><img src={f.photo} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:4,border:"1px solid var(--ln)"}}/><button className="rc-bs rc-bsr" onClick={()=>{dropPhotoLater(f.photo);set("photo","");if(s.modal==="edit-part"&&s.md&&s.md.id)d({type:"UPDATE",list:"inventory",id:s.md.id,d:{photo:""}});}} style={{position:"absolute",top:6,right:6,fontSize:11}}>Remove</button></div>):null}<div style={{display:"flex",gap:6,alignItems:"center"}}><label className="rc-bs" style={{cursor:uploading?"default":"pointer",textAlign:"center",opacity:uploading?.6:1}}>{uploading?"⏳ Uploading…":"📷 Upload"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>{const file=e.target.files[0];if(!file)return;setUploading(true);uploadPhoto(file).then(u=>{const old=f.photo;if(old&&old!==u)dropPhotoLater(old);set("photo",u);if(s.modal==="edit-part"&&s.md&&s.md.id){d({type:"UPDATE",list:"inventory",id:s.md.id,d:{photo:u}});d({type:"TOAST",d:{msg:"📷 Photo saved",t:Date.now()}});}}).catch(err=>{console.error("photo upload failed:",err&&err.message?err.message:err);d({type:"TOAST",d:{msg:"⚠ Photo upload failed — try again",t:Date.now()}});}).finally(()=>setUploading(false));}} style={{display:"none"}}/></label><input className="rc-fi" placeholder="...or paste image URL" value={(f.photo||"").startsWith("data:")?"":(f.photo||"")} onChange={e=>set("photo",e.target.value)} style={{flex:1}}/></div></div>);
  const TA=(k,l,rows)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><textarea className="rc-fi" rows={rows||3} value={f[k]||""} onChange={e=>set(k,e.target.value)} placeholder={l} style={{resize:"vertical",lineHeight:1.5}}/></div>);
  const SYM=(sy,tog)=>(<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{SYMPTOMS.map(t=>(<button key={t} className={"rc-fb"+(sy.includes(t)?" on":"")} onClick={()=>tog(t)} style={{textTransform:"none",letterSpacing:0,fontSize:12}}>{t}</button>))}</div>);
  const C=<button className="rc-bs" onClick={()=>d({type:"CLOSE"})}>Close</button>;
  const X=<button className="rc-bs" onClick={()=>d({type:"CLOSE"})}>Cancel</button>;
  // need: what's missing ("" or false when the form can save); the Save button waits for it and says why.
const FM=(t,flds,onSave,need)=>W(<div><div className="rc-mt">{t}</div>{flds.map(([k,l,tp])=>F(k,l,tp))}{WHY(need)}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!need} onClick={onSave}>Save</button></div></div>);
  const EFM=(t,list,flds,tr)=>W(<div><div className="rc-mt">{t}</div>{flds.map(([k,l,tp])=>F(k,l,tp))}<div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list,id:s.md.id,d:tr?tr(f):f});d({type:"CLOSE"});}}>Save Changes</button></div></div>);
  const LI=()=>(<><div className="rc-li rc-li-h" aria-hidden="true"><span>Description</span><span>Qty</span><span>Price</span><span/></div>{lines.map((li,i)=>(<div key={i} className="rc-li"><input className="rc-fi" placeholder="Description" aria-label={"Line "+(i+1)+" description"} value={li.d} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],d:e.target.value};setLines(nl);}}/><input className="rc-fi" placeholder="Qty" aria-label={"Line "+(i+1)+" quantity"} type="number" value={li.q} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],q:+e.target.value||0};setLines(nl);}}/><input className="rc-fi" placeholder="Price" aria-label={"Line "+(i+1)+" price"} type="number" value={li.r} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],r:+e.target.value||0};setLines(nl);}}/><button className="rc-bs" aria-label={"Remove line "+(i+1)} style={{padding:"8px 0"}} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}>×</button></div>))}<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><button className="rc-bs" onClick={()=>setLines([...lines,{d:"",q:1,r:0}])}>+ Line</button>{svcActive(s).length>0&&<select className="rc-fi" value="" onChange={e=>{const x=svcById(s,e.target.value);if(!x)return;const hr=x.pricing==="hourly";const ln={d:x.name,q:hr?(+x.hours||1):1,r:hr?shopRate(s):(+x.price||0),svcId:x.id};const blank=lines.length===1&&!lines[0].d&&!(+lines[0].r);setLines(blank?[ln]:[...lines,ln]);}} style={{flex:1,minWidth:210,width:"auto",appearance:"none"}}><option value="">+ Add a service from your price list…</option>{svcCats(svcActive(s)).map(c=>(<optgroup key={c} label={c}>{svcActive(s).filter(x=>(x.cat||"Other")===c).map(x=>(<option key={x.id} value={x.id}>{x.name}{x.pricing==="hourly"?" · hourly":(+x.price?" · "+$$(+x.price):"")}</option>))}</optgroup>))}</select>}</div></>);
  const sub=lines.reduce((a,l)=>a+(l.q||0)*(l.r||0),0);

  // ECM: open a new job on one of our engines (from its passport), keeping Back to the passport.
  const newEcmFor=e=>{const nid=Date.now();const inv0=(s.invoices||[]).find(v=>+v.engineId===e.id);d({type:"ADD",list:"ecmJobs",d:{id:nid,date:isoToday(),status:"intake",...ecmBlank(),custId:inv0?(+inv0.custId||0):0,engineId:e.id,family:ecmFamOf(e),esn:e.serial||e.esn||"",cpl:e.cpl||"",arrangement:e.arrangement||"",hp:e.ratedHp||""},label:"ECM job opened"});d({type:"MODAL",v:"part-detail",d:{...e,ptab:"diagnosis"}});d({type:"MODAL",v:"ecm-job",d:{id:nid}});};

  // Prospects / shops: convert to a customer, linked both ways (record.customerId and customer.prospectId).
  const convertRec=(list,r)=>{const nid=Date.now();const comp=list==="competitors";d({type:"ADD",list:"customers",keep:true,d:{id:nid,name:r.name,type:comp?"Shop":"Fleet",phone:nb(r.phone),email:"",province:"AB",address:nb(r.address),city:r.city||"",vehicles:[],notes:[r.contactName&&("Contact: "+r.contactName+(r.contactRole?", "+r.contactRole:"")),r.truckCount&&(r.truckCount+" trucks"),(r.engines||[]).length&&("Runs "+r.engines.map(ecmFamLabel).join(", ")),comp?(r.specialty||r.category):r.haul].filter(Boolean).join(" · "),tags:[comp?"shop":"fleet","prospect"],spent:0,visits:0,last:today(),prospectId:r.id,prospectList:list},label:"✓ "+r.name+" is now a customer"});d({type:"UPDATE",list,id:r.id,d:{customerId:nid,status:"customer",log:[...(r.log||[]),{date:isoToday(),by:CURRENT_USER,type:"note",outcome:"Converted to customer",notes:""}]}});};

  // Detail modals
  if(s.modal==="job-detail"){const j=(s.jobs||[]).find(x=>x.id===(s.md&&s.md.id))||s.md||{};const nx={queued:"in-progress","in-progress":"complete"};const te=jobTime(s,j);const thrs=jobHours(s,j);const tlab=jobCost(s,j);const svc=jobKind(j)==="service";const chg=jobCharge(s,j);const hourly=jobPricing(j)==="hourly";const inv=jobInv(s,j);const eng=j.engineId?engById(s,j.engineId):null;const profit=chg-tlab;
    return W(<div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><div className="rc-mt" style={{margin:0}}>Work Order</div><span className="rc-fb on" style={{cursor:"default"}}>{svc?"Service":"Reman · our engine"}</span><Badge s={j.status}/></div>
      <div style={{fontSize:17,fontWeight:600,margin:"10px 0 12px"}}>{j.service||"Job"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",marginBottom:12}}>{[["Customer",jobCust(s,j)],...(eng?[["Engine",eng.name||eng.sku]]:[]),...(j.vehicle?[[svc?"Truck / unit":"Stand / unit",j.vehicle]]:[]),["Tech",j.tech||"Unassigned"],...(j.due?[["Due",j.due]]:[]),...(j.type&&!j.kind?[["Type",j.type]]:[])].map(([l,v],k)=>(<div key={k}><div className="rc-fl">{l}</div><div style={{fontSize:14.5}}>{v||"—"}</div></div>))}</div>
      {svc&&(<div className="rc-card" style={{padding:12,marginBottom:12}}><div className="rc-3c">
        <div><div className="rc-ml">{hourly&&!inv?"Charge so far":"Charged"}</div><div className="rc-mv">{$$(chg)}</div><div style={{fontSize:12,color:"var(--mt)"}}>{hourly?(inv?"billed by the hour":thrs+"h × "+$$(jobRate(s,j))+"/hr"):"flat price"}</div></div>
        <div><div className="rc-ml">Labour cost</div><div className="rc-mv">{$$(tlab)}</div><div style={{fontSize:12,color:"var(--mt)"}}>{thrs}h at tech pay</div></div>
        <div><div className="rc-ml">Labour profit</div><div className="rc-mv" style={{color:profit<0?"var(--r)":"var(--g)"}}>{$$(profit)}</div><div style={{fontSize:12,color:"var(--mt)"}}>{chg>0?Math.round(profit/chg*100)+"% of the charge":"no charge set"}</div></div>
      </div>
      <div style={{fontSize:13,marginTop:10,color:inv?"var(--g)":"var(--w)"}}>{inv?"✓ Billed on "+(inv.invNum||inv.id)+" · "+inv.status:"Not billed yet"}</div>
      {hourly&&!jobRate(s,j)&&<div style={{fontSize:12.5,color:"var(--w)",marginTop:4}}>No shop rate set, so hourly work has no price. Set it in Sales → Services.</div>}
      {!hourly&&!chg&&!inv&&<div style={{fontSize:12.5,color:"var(--w)",marginTop:4}}>No charge set. Edit the work order to add one before you bill it.</div>}
      </div>)}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"4px 0 6px",gap:8,flexWrap:"wrap"}}><span className="rc-fl" style={{margin:0}}>Time logged — {thrs}h · {$$(tlab)}{!svc&&j.engineId&&<span style={{color:"var(--g)",marginLeft:6,fontWeight:500}}>→ this engine's cost</span>}</span><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-time",d:{job:j}})}>+ Log Time</button></div>
      {te.length>0?<div style={{background:"var(--sf2)",borderRadius:6,padding:8,marginBottom:8}}>{te.map(t=>(<div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"4px 0",borderBottom:"1px solid var(--ln)",fontSize:13}}><span style={{flex:1,minWidth:0}}><span style={{color:"var(--act)"}}>{t.tech}</span> · {t.date} · {t.hours}h @ ${t.rate}{t.notes?<span style={{color:"var(--mt)"}}> · {t.notes}</span>:""}</span><span style={{fontWeight:600,width:62,textAlign:"right"}}>{$$((+t.hours||0)*(+t.rate||0))}</span><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-time",d:t})} style={{fontSize:14,padding:"2px 6px"}}>✎</button><button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"timeEntries",id:t.id})} style={{fontSize:14,padding:"2px 6px"}}>×</button></div>))}</div>:<div style={{fontSize:13,color:"var(--mt)",fontStyle:"italic",margin:"2px 0 8px"}}>No time logged yet.</div>}
      {j.notes&&<div className="rc-fg" style={{marginTop:8}}><div className="rc-fl">Notes</div><div style={{fontSize:14,color:"var(--tx2)"}}>{j.notes}</div></div>}
      <div className="rc-fa">{C}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-job",d:j})}>✎ Edit</button>{svc&&!inv&&(chg>0||hourly)&&<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-inv",d:{custId:j.custId,prefillItems:[jobBillLine(s,j)]}})}>🧾 Bill this job</button>}{j.status!=="complete"&&<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"jobs",id:j.id,d:{status:nx[j.status]||"in-progress"}});d({type:"CLOSE"});}}>→ {nx[j.status]==="complete"?"Complete":"In Progress"}</button>}</div>
    </div>);}
  if(s.modal==="cust-detail"){const c=s.md;return W(<div><div className="rc-mt">Customer</div><div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:21}}>{c.name}</div><div style={{fontSize:14,color:"var(--act)"}}>{c.type} {c.province?`· ${c.province}`:""}</div><div style={{fontSize:14,color:"var(--tx2)",margin:"6px 0 12px"}}>{[c.phone,c.email].filter(Boolean).join(" · ")||"No phone or email yet"}</div><div className="rc-3c" style={{marginBottom:12}}><div><div className="rc-ml">Paid</div><div className="rc-mv">{$K(Mny.custPaid(s,c.id))}</div></div><div><div className="rc-ml">Visits</div><div className="rc-mv">{c.visits||0}</div></div><div><div className="rc-ml">Last</div><div className="rc-mv" style={{fontSize:14.5}}>{c.last||"—"}</div></div></div>{(c.vehicles||[]).length>0&&<div className="rc-fg"><div className="rc-fl">Vehicles</div><div style={{fontSize:14,color:"var(--tx2)"}}>{c.vehicles.join(" · ")}</div></div>}{c.notes&&<div className="rc-fg"><div className="rc-fl">Notes</div><div style={{fontSize:14,color:"var(--tx2)"}}>{c.notes}</div></div>}{(()=>{const cj=(s.jobs||[]).filter(j=>sameId(j.custId,c.id));if(!cj.length)return null;const tot=cj.reduce((a,j)=>a+jobCharge(s,j),0);return(<><div className="rc-fl" style={{marginTop:10,display:"flex",justifyContent:"space-between",gap:10}}><span>Work done</span><span style={{color:"var(--tx)"}}>{$$(tot)} charged</span></div>{cj.map(j=>(<div key={j.id} role="button" tabIndex={0} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})} onKeyDown={e=>{if(e.key==="Enter")d({type:"MODAL",v:"job-detail",d:j});}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--ln)",fontSize:14,cursor:"pointer"}}><span style={{flex:1,minWidth:0}}>{j.service}</span><span style={{fontWeight:600}}>{jobKind(j)==="service"?$$(jobCharge(s,j)):"—"}</span><Badge s={j.status}/></div>))}</>);})()}{(()=>{const ej=(s.ecmJobs||[]).filter(x=>sameId(x.custId,c.id));if(!ej.length)return null;return(<><div className="rc-fl" style={{marginTop:10}}>ECM jobs</div>{ej.map(x=>(<div key={x.id} role="button" tabIndex={0} onClick={()=>d({type:"MODAL",v:"ecm-job",d:{id:x.id}})} onKeyDown={e=>{if(e.key==="Enter")d({type:"MODAL",v:"ecm-job",d:{id:x.id}});}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--ln)",fontSize:14,cursor:"pointer"}}><span style={{flex:1,minWidth:0}}>{(x.types||[]).map(ecmTypeLabel).join(", ")||"ECM job"}<span style={{display:"block",fontSize:12,color:"var(--mt)"}}>{x.date}{x.unit?" · unit "+x.unit:""}</span></span><span style={{fontWeight:600}}>{x.billTo==="warranty"?"—":$$(ecmCharge(s,x))}</span><Badge s={x.status||"intake"}/></div>))}</>);})()}{(s.invoices||[]).filter(inv=>sameId(inv.custId,c.id)).length>0&&<><div className="rc-fl" style={{marginTop:10}}>Invoices</div>{(s.invoices||[]).filter(inv=>sameId(inv.custId,c.id)).map(inv=>(<div key={inv.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--ln)",fontSize:14,gap:6}}><span style={{color:"var(--act)"}}>{inv.invNum}</span><span>{$$(invTot(inv))}</span><Badge s={inv.status}/></div>))}</>}<div className="rc-fa">{C}{c.prospectId!=null&&c.prospectId!==""&&<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"pros-rec",d:{list:c.prospectList||"prospects",id:c.prospectId}})}>{c.prospectList==="competitors"?"Open shop record":"Open prospect record"}</button>}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-cust",d:c})}>✎ Edit</button></div></div>);}
  if(s.modal==="inv-detail"){const inv=(s.invoices||[]).find(x=>x.id===(s.md&&s.md.id))||s.md;const sb=Mny.docSub(inv);return W(<div><div className="rc-mt">{inv.invNum||inv.id}</div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><div className="rc-fl">Customer</div><div style={{fontFamily:"var(--fd)",fontWeight:600}}>{cn(s.customers,inv.custId)}</div></div><div style={{textAlign:"right"}}><div className="rc-fl">Status</div><Badge s={Mny.invStatus(inv)}/></div></div><div style={{fontSize:13.5,color:"var(--tx2)",marginBottom:12}}>Dated {Mny.docDate(inv)} · {inv.due||"Net 30"} · {Mny.isPaid(inv)?"paid"+(inv.paidDate?" "+inv.paidDate:""):"due "+Mny.dueDateOf(inv)+(Mny.isOverdue(inv)?" · "+Mny.daysLate(inv)+" days late":"")}</div><div className="rc-fl">Line Items</div><div style={{background:"var(--sf2)",borderRadius:6,padding:10,marginBottom:12}}>{(inv.items||[]).map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<inv.items.length-1?"1px solid var(--ln)":"none",fontSize:14}}><span style={{flex:1}}>{it.d}{it.svcId?<span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--act)",marginLeft:7}}>SERVICE</span>:null}{it.ecmJobId?<span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--act)",marginLeft:7}}>ECM</span>:null}</span><span style={{width:40,textAlign:"center",color:"var(--mt)"}}>×{it.q}</span><span style={{width:80,textAlign:"right",fontWeight:600}}>{$$(it.q*it.r)}</span></div>))}</div>{[["Subtotal",sb],[Mny.taxName(inv),Mny.docTax(inv)],["Total",Mny.docTotal(inv)]].map(([l,v],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:i===2?14:12,fontWeight:i===2?700:400,color:i===2?"var(--ac)":"var(--tx2)"}}><span>{l}</span><span>{$$(v)}</span></div>))}<div className="rc-fa">{C}{!Mny.isPaid(inv)&&<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"invoices",id:inv.id,d:{status:"paid",paidDate:isoToday()}});d({type:"CLOSE"});}}>Mark Paid</button>}</div></div>);}
  if(s.modal==="quote-detail"){const q=s.md;const sb=qTot(q);return W(<div><div className="rc-mt">{q.quoteNum||"Quote"}</div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><div className="rc-fl">Customer</div><div style={{fontFamily:"var(--fd)",fontWeight:600}}>{cn(s.customers,q.custId)}</div></div><Badge s={q.status}/></div>{q.description&&<div style={{fontSize:14,color:"var(--tx2)",marginBottom:10}}>{q.description}</div>}<div className="rc-fl">Items</div><div style={{background:"var(--sf2)",borderRadius:6,padding:10,marginBottom:12}}>{(q.items||[]).map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<q.items.length-1?"1px solid var(--ln)":"none",fontSize:14}}><span style={{flex:1}}>{it.d}{it.svcId?<span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:"var(--act)",marginLeft:7}}>SERVICE</span>:null}</span><span style={{width:80,textAlign:"right",fontWeight:600}}>{$$(it.q*it.r)}</span></div>))}</div>{[["Subtotal",sb],[Mny.taxName(q),Mny.docTax(q)],["Total",Mny.docTotal(q)]].map(([l,v],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:i===2?14:12,fontWeight:i===2?700:400,color:i===2?"var(--ac)":"var(--tx2)"}}><span>{l}</span><span>{$$(v)}</span></div>))}<div className="rc-fa">{C}{q.status==="approved"&&!q.invoiceId&&<button className="rc-ba" onClick={()=>{quoteToInvoice(s,d,q);d({type:"CLOSE"});}}>→ Invoice</button>}</div></div>);}
  if(s.modal==="appt-detail"){const a=s.md;return W(<div><div className="rc-mt">Appointment</div>{[["Customer",cn(s.customers,a.custId)],["Service",a.service],["Date",a.date],["Time",a.time],["Tech",a.tech],...(a.notes?[["Notes",a.notes]]:[])].map(([l,v],i)=>(<div key={i} className="rc-fg"><div className="rc-fl">{l}</div><div style={{fontSize:14.5}}>{v}</div></div>))}<div className="rc-fg"><div className="rc-fl">Status</div><Badge s={a.status}/></div><div className="rc-fa">{C}{a.ecmJobId&&<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"ecm-job",d:{id:+a.ecmJobId,etab:"follow"}})}>Open ECM job</button>}{a.status==="pending"&&<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"schedule",id:a.id,d:{status:"confirmed"}});d({type:"CLOSE"});}}>Confirm</button>}</div></div>);}
  if(s.modal==="emp-detail"){const e=s.md;return W(<div><div className="rc-mt">Employee</div><div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:21}}>{e.name}</div><div style={{fontSize:14,color:"var(--act)",marginBottom:10}}>{e.role}</div><div className="rc-3c" style={{marginBottom:12}}>{owner&&<div><div className="rc-ml">Rate</div><div className="rc-mv">${e.rate}/hr</div></div>}<div><div className="rc-ml">Hrs</div><div className="rc-mv">{e.hrs}</div></div><div><div className="rc-ml">Hired</div><div className="rc-mv" style={{fontSize:14.5}}>{e.hireDate}</div></div></div>{e.phone&&<div className="rc-fg"><div className="rc-fl">Phone</div><div style={{fontSize:14}}>{e.phone}</div></div>}{(e.specialties||[]).length>0&&<div className="rc-fg"><div className="rc-fl">Specialties</div><div style={{fontSize:14,color:"var(--tx2)"}}>{e.specialties.join(", ")}</div></div>}{(e.certs||[]).length>0&&<div className="rc-fg"><div className="rc-fl">Certs</div><div style={{fontSize:14,color:"var(--g)"}}>{e.certs.join(", ")}</div></div>}<div className="rc-fa">{C}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-emp",d:e})}>✎</button><button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"employees",id:e.id,d:{status:e.status==="active"?"on-leave":"active"}});d({type:"CLOSE"});}}>{e.status==="active"?"Leave":"Activate"}</button></div></div>);}

  if(s.modal==="add-bom"){const src=s.md&&s.md.cloneOf?bomById(s,s.md.cloneOf):null;
    return W(<div><div className="rc-mt">{src?"Clone Worksheet":"New Worksheet"}</div>
      {src&&<div style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>Copies all {(src.lines||[]).length} lines from {src.label}. Change what the new family does differently.</div>}
      {F("bmLabel","Name (e.g. Cummins ISX15 · CM2350)")}{F("bmFamily","Family (e.g. ISX15)")}{F("bmModel","Model / ECM (e.g. CM2350)")}{F("bmMatch","Match tokens, comma separated (blank = every engine)")}{F("bmRev","Rev")}{F("bmNote","Subtitle")}
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{const lab=(f.bmLabel||"").trim();if(!lab)return;const lines=src?(src.lines||[]).map((l,x)=>({...l,id:Date.now()+x})):[];d({type:"ADD",list:"boms",d:{label:lab,family:(f.bmFamily||"").trim(),model:(f.bmModel||"").trim(),match:(f.bmMatch||"").split(",").map(x=>x.trim()).filter(Boolean),rev:(f.bmRev||"1.0").trim(),note:(f.bmNote||"").trim(),rule:src?src.rule:"",watch:"",lines},label:"Worksheet created"});}}>Create</button></div>
    </div>);}
  if(s.modal==="edit-bom"){const b=s.md;return W(<div><div className="rc-mt">Worksheet Details</div>
      {F("bmLabel","Name")}{F("bmFamily","Family")}{F("bmModel","Model / ECM")}{F("bmMatch","Match tokens, comma separated")}{F("bmRev","Rev")}{F("bmNote","Subtitle")}{TA("bmWatch","What bites on this family",3)}{TA("bmRule","The rule at the bottom of the sheet",3)}
      <div className="rc-fa">{X}<button className="rc-bs rc-bsr" onClick={()=>d({type:"DELETE",list:"boms",id:b.id,label:"Worksheet deleted"})}>Delete</button><button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"boms",id:b.id,d:{label:(f.bmLabel||"").trim()||b.label,family:(f.bmFamily||"").trim(),model:(f.bmModel||"").trim(),match:(f.bmMatch||"").split(",").map(x=>x.trim()).filter(Boolean),rev:(f.bmRev||"").trim(),note:(f.bmNote||"").trim(),watch:f.bmWatch||"",rule:f.bmRule||""}});d({type:"CLOSE"});}}>Save Changes</button></div>
    </div>);}
  if(s.modal==="add-bomline"||s.modal==="edit-bomline"){const ed=s.modal==="edit-bomline";const b=bomById(s,s.md&&s.md.bomId);if(!b)return W(<div><div className="rc-mt">No worksheet</div><div className="rc-fa">{C}</div></div>);
    const kind=f.blKind||lineKind(s.md||{});
    return W(<div><div className="rc-mt">{ed?"Edit Line":"Add Line"}</div>
      {F("blSec","Section")}{F("blQty","Qty (a number, set, or blank)")}{F("blPart","Part")}
      <div className="rc-fg"><label className="rc-fl">Which page</label><select className="rc-fi" value={kind} onChange={e=>set("blKind",e.target.value)} style={{appearance:"none"}}><option value="order">Parts order — always new, ordered the day the job opens</option><option value="decide">Decision sheet — reuse, missing or machine; blank means replace</option></select></div>
      {F("blNote","What to check (e.g. bore / counterbore)")}
      <div className="rc-fg"><label className="rc-fl" style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}><input type="checkbox" checked={!!f.blMach} onChange={e=>set("blMach",e.target.checked)}/> Usually goes to the machine shop</label></div>
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{const part=(f.blPart||"").trim();if(!part)return;const row={sec:(f.blSec||"").trim()||(kind==="order"?"Parts order — always new":"Decision sheet"),qty:(f.blQty||"").trim(),part,kind,note:(f.blNote||"").trim(),mach:f.blMach?1:0};const ls=b.lines||[];d({type:"UPDATE",list:"boms",id:b.id,d:{lines:ed?ls.map(l=>l.id===s.md.id?{...l,...row}:l):[...ls,{id:Date.now(),...row}]}});d({type:"CLOSE"});}}>{ed?"Save Changes":"Add"}</button></div>
    </div>);}
  if(s.modal==="add-vendor")return FM("Add Supplier",[["vnName","Name"],["vnSite","Site (e.g. paiindustries.com)"],["vnSearch","Search URL — use {q} where the part goes"],["vnNote","What you buy there"]],()=>{const n=(f.vnName||"").trim();if(!n)return;const site=(f.vnSite||"").trim().replace(/^https?:\/\//,"").replace(/\/$/,"");d({type:"ADD",list:"vendors",d:{name:n,site,search:(f.vnSearch||"").trim()||("https://www.google.com/search?q=site%3A"+site+"+{q}"),note:(f.vnNote||"").trim()},label:"Supplier added"});},!(""+(f.vnName||"")).trim()&&"Add the supplier's name.");
  if(s.modal==="edit-vendor")return EFM("Edit Supplier","vendors",[["name","Name"],["site","Site"],["search","Search URL — {q} is the part"],["note","What you buy there"]]);
  // ── BOM worksheet: parts order · machine shop list · line detail · sheet info ──
  if(s.modal==="bom-shop"){
    const eng=engById(s,s.md&&s.md.engineId)||{};const sh=sheetFor(s,eng.id);const bm=sh?bomById(s,sh.bomId):null;
    if(!bm)return W(<div><div className="rc-mt">No worksheet</div><div style={{fontSize:13,color:"var(--mt)"}}>Start one from the engine's BOM tab first.</div><div className="rc-fa">{C}</div></div>);
    const setRow=(lid,patch)=>{const rows={...(sh.rows||{})};rows[lid]={...(rows[lid]||{}),...patch};d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{rows}});};
    const setSh=p=>d({type:"UPDATE",list:"bomSheets",id:sh.id,d:p});
    const st=bomStats(bm,sh);const buy=bomBuy(bm,sh);
    const vens=(s.vendors||[]);const ven=vens.find(v=>String(v.id)===String(f.bven))||vens[0];
    const tot=buy.reduce((a,z)=>a+(+sheetRow(sh,z.l.id).cost||0),0);
    const unlogged=buy.filter(z=>{const r=sheetRow(sh,z.l.id);return(+r.cost||0)>0&&!r.logged;});
    const logSum=unlogged.reduce((a,z)=>a+(+sheetRow(sh,z.l.id).cost||0),0);
    const inp=(k,ph,w)=>(<input className="rc-fi" placeholder={ph} value={sh[k]||""} onChange={e=>setSh({[k]:e.target.value})} style={{flex:w||1,minWidth:110,padding:"7px 9px",fontSize:13}}/>);
    const SECS=[["order","Order the day the job opens","Always new, no inspection. Strike anything not going on this job from the engine's BOM tab."],["miss","Missing from the core","Wasn't there when it was opened. Buy it, and claim it back on the core."],["repl","Replace — from the decision sheet","Left blank when the decision sheet was signed off."]];
    return W(<div>
      <div className="rc-mt" style={{marginBottom:3}}>Long Block Parts Order</div>
      <div style={{fontSize:12,color:"var(--mt)",letterSpacing:1,marginBottom:12}}>{eng.name||eng.sku} · {bm.label} · rev {bm.rev}{(eng.serial||eng.esn)?" · ESN "+(eng.serial||eng.esn):""}{eng.cpl?" · CPL "+eng.cpl:""}{sh.wo?" · WO "+sh.wo:""}</div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>{inp("supplier","Supplier",1.4)}{inp("po","PO #",1)}</div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12,fontSize:13}}>
        {st.ordered?(<><span style={{color:"var(--g)"}}>✓ Ordered {sh.orderedDate}{sh.orderedBy?" by "+sh.orderedBy:""}</span><button className="rc-bs rc-noprint" onClick={()=>setSh({orderedDate:"",orderedBy:""})}>Not ordered yet</button></>):(<><span style={{color:"var(--w)"}}>Not ordered yet</span><button className="rc-ba rc-noprint" style={{padding:"6px 12px",fontSize:13}} onClick={()=>{setSh({orderedDate:isoToday(),orderedBy:CURRENT_USER});d({type:"TOAST",d:{msg:"🛒 Order marked placed"+(sh.po?" · PO "+sh.po:""),t:Date.now()}});}}>✓ Mark ordered</button></>)}
      </div>
      {vens.length>0&&<div className="rc-noprint" style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}><span style={{fontSize:11,color:"var(--tx2)",letterSpacing:1,textTransform:"uppercase"}}>Search at</span>{vens.map(v=>(<button key={v.id} className={"rc-fb"+(ven&&ven.id===v.id?" on":"")} onClick={()=>set("bven",String(v.id))}>{v.name}</button>))}</div>}
      {SECS.map(([why,title,sub])=>{const ls=buy.filter(z=>z.why===why);
        if(why==="repl"&&!st.signed)return(<div key={why} className="rc-card" style={{padding:"10px 12px",marginBottom:10}}><div className="rc-fl" style={{marginBottom:4}}>{title}</div><div style={{fontSize:13,color:"var(--tx2)",lineHeight:1.5}}>Decision sheet still open — {st.open} line{st.open===1?"":"s"} blank. Whatever is still blank when the tech signs it off lands here.</div></div>);
        if(!ls.length)return null;
        return(<div key={why} className="rc-card" style={{padding:"8px 11px",marginBottom:10}}>
          <div className="rc-fl" style={{marginBottom:2}}>{title} · {ls.length}</div>
          <div style={{fontSize:11,color:"var(--mt)",marginBottom:4}}>{sub}</div>
          {ls.map(({l})=>{const r=sheetRow(sh,l.id);return(<div key={l.id} style={{padding:"6px 0",borderBottom:"1px solid var(--ln2)"}}>
            <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{width:30,textAlign:"right",fontSize:11,color:"var(--mt)",flexShrink:0}}>{l.qty}</span>
              <span style={{flex:1,minWidth:130,fontSize:13}}>{l.part}</span>
              <input className="rc-fi" type="number" placeholder="$" value={r.cost||""} onChange={e=>setRow(l.id,{cost:e.target.value})} style={{width:84,padding:"5px 8px",fontSize:12.5}}/>
              {ven&&<a className="rc-fb rc-noprint" href={buyUrl(ven,buyQ(bm,l,r.pn))} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>🔎 {ven.name}</a>}
              {r.url&&<a className="rc-fb rc-noprint" href={safeUrl(r.url)||undefined} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",borderColor:"var(--g)",color:"var(--g)"}}>🔗 Saved</a>}
              <button className="rc-fb rc-noprint" onClick={()=>d({type:"MODAL",v:"bom-note",d:{engineId:eng.id,lineId:l.id,part:l.part}})} style={{fontSize:12,padding:"3px 7px"}}>✎</button>
            </div>
            {(r.pn||r.meas||(why!=="order"&&l.note))&&<div style={{fontSize:11,color:(r.pn||r.meas)?"var(--g)":"var(--mt)",paddingLeft:37,marginTop:2}}>{[r.pn&&("PN "+r.pn),r.meas||(why!=="order"?l.note:"")].filter(Boolean).join(" · ")}</div>}
            {r.logged&&<div style={{fontSize:11,color:"var(--g)",paddingLeft:37,marginTop:2}}>✓ in the cost basis</div>}
          </div>);})}
        </div>);})}
      <div className="rc-fg"><label className="rc-fl">Backorders + ETA</label><textarea className="rc-fi" rows={2} placeholder="What's on backorder and when it lands" value={sh.backorders||""} onChange={e=>setSh({backorders:e.target.value})} style={{resize:"vertical",lineHeight:1.5}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,margin:"4px 3px 12px"}}><span style={{color:"var(--tx2)"}}>{buy.length} line{buy.length===1?"":"s"} to buy</span><span style={{color:"var(--w)"}}>{$$(tot)}</span></div>
      <div className="rc-fa rc-noprint">{C}<button className="rc-bs" onClick={()=>window.print()}>🖨 Print</button>{unlogged.length>0&&<button className="rc-ba" onClick={()=>{const add=unlogged.map(z=>({d:z.l.part,v:+sheetRow(sh,z.l.id).cost||0,date:isoToday()}));const nl=[...(eng.partsLog||[]),...add];const rows={...(sh.rows||{})};unlogged.forEach(z=>{rows[z.l.id]={...(rows[z.l.id]||{}),logged:1};});d({type:"UPDATE",list:"inventory",id:eng.id,d:{partsLog:nl}});d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{rows}});d({type:"TOAST",d:{msg:"🧩 "+add.length+" parts → cost basis · "+$$(logSum),t:Date.now()}});}}>Log {unlogged.length} to cost basis · {$$(logSum)}</button>}</div>
    </div>,"rc-pmod");}
  if(s.modal==="bom-mach"){
    const eng=engById(s,s.md&&s.md.engineId)||{};const sh=sheetFor(s,eng.id);const bm=sh?bomById(s,sh.bomId):null;
    if(!bm)return W(<div><div className="rc-mt">No worksheet</div><div style={{fontSize:13,color:"var(--mt)"}}>Start one from the engine's BOM tab first.</div><div className="rc-fa">{C}</div></div>);
    const ls=bomPick(bm,sh,"mach");
    return W(<div>
      <div className="rc-mt" style={{marginBottom:3}}>Machine Shop — What Goes Out</div>
      <div style={{fontSize:12,color:"var(--mt)",letterSpacing:1,marginBottom:12}}>{eng.name||eng.sku} · {bm.label}{(eng.serial||eng.esn)?" · ESN "+(eng.serial||eng.esn):""}{eng.cpl?" · CPL "+eng.cpl:""}{sh.wo?" · WO "+sh.wo:""}</div>
      {ls.length===0?(<div style={{fontSize:13,color:"var(--mt)",padding:"14px 0"}}>Nothing ticked MACH yet. Tick it on the engine's decision sheet and it lands here.</div>):(<div className="rc-card" style={{padding:"8px 11px",marginBottom:12}}>
        {ls.map(l=>{const r=sheetRow(sh,l.id);return(<div key={l.id} style={{padding:"7px 0",borderBottom:"1px solid var(--ln2)"}}>
          <div style={{display:"flex",gap:7,alignItems:"baseline",flexWrap:"wrap"}}><span style={{width:30,textAlign:"right",fontSize:11,color:"var(--mt)",flexShrink:0}}>{l.qty}</span><span style={{flex:1,fontSize:13}}>{l.part}</span><span style={{fontSize:11,color:"var(--mt)"}}>{l.note||""}</span></div>
          {r.meas&&<div style={{fontSize:11,color:"var(--g)",paddingLeft:37,marginTop:2}}>{r.meas}</div>}
        </div>);})}
      </div>)}
      {ls.length>0&&<div style={{fontSize:12,color:"var(--tx2)",marginBottom:12,lineHeight:1.5}}>Hand this to the machine shop with the parts. The green line under each part is what the tech measured.</div>}
      <div className="rc-fa rc-noprint">{C}<button className="rc-bs" onClick={()=>window.print()}>🖨 Print</button></div>
    </div>,"rc-pmod");}
  if(s.modal==="bom-note"){const eng=engById(s,s.md&&s.md.engineId)||{};const sh=sheetFor(s,eng.id);const lid=s.md&&s.md.lineId;const bm=sh?bomById(s,sh.bomId):null;const line=bm&&(bm.lines||[]).find(l=>l.id===+lid);
    return W(<div><div className="rc-mt" style={{marginBottom:3}}>Line detail</div>
      <div style={{fontSize:13,color:"var(--tx)",marginBottom:2}}>{(s.md&&s.md.part)||""}</div>
      <div style={{fontSize:11,color:"var(--mt)",marginBottom:12}}>{line&&lineKind(line)==="order"?"Parts order — always new, ordered the day the job opens":"Decision sheet — reuse only with the number written down; blank means replace"}{line&&line.note?" · "+line.note:""}</div>
      {line&&lineKind(line)==="decide"&&F("bnMeas","Measurement / what you found")}
      {F("bnPn","Part number")}
      {F("bnUrl","Direct buy link")}
      {(s.vendors||[]).length>0&&line&&bm&&<div className="rc-fg"><label className="rc-fl">Find it</label><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{(s.vendors||[]).map(v=>(<a key={v.id} className="rc-fb" href={buyUrl(v,buyQ(bm,line,f.bnPn))} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>{v.name}</a>))}</div></div>}
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{if(!sh)return;const rows={...(sh.rows||{})};rows[lid]={...(rows[lid]||{}),meas:(f.bnMeas||"").trim(),pn:(f.bnPn||"").trim(),url:(f.bnUrl||"").trim()};d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{rows}});d({type:"BACK"});}}>Save</button></div>
    </div>);}
  if(s.modal==="bom-sheet"){const eng=engById(s,s.md&&s.md.engineId)||{};const sh=sheetFor(s,eng.id);const bm=sh?bomById(s,sh.bomId):null;if(!sh)return W(<div><div className="rc-mt">No worksheet</div><div className="rc-fa">{C}</div></div>);
    const st=bm?bomStats(bm,sh):null;
    return W(<div><div className="rc-mt" style={{marginBottom:3}}>Worksheet</div>
      <div style={{fontSize:12,color:"var(--mt)",letterSpacing:1,marginBottom:12}}>{eng.name||eng.sku} · {bm?bm.label:""}{st?" · "+(st.ordered?"ordered":"not ordered")+" · "+(st.signed?"signed off":"decisions open"):""}</div>
      {(()=>{const others=(s.boms||[]).filter(b=>+b.id!==+sh.bomId);if(!others.length)return null;
        const swap=nid=>{const nb=bomById(s,nid);if(!nb)return;const ob=bomById(s,sh.bomId);
          const byName=new Map();((ob&&ob.lines)||[]).forEach(l=>{const r=(sh.rows||{})[l.id];if(r&&(r.d||r.meas||r.pn||r.url||r.cost))byName.set(normM(l.part),r);});
          const rows={};let kept=0;(nb.lines||[]).forEach(l=>{const r=byName.get(normM(l.part));if(r){const v=r.d==="repl"?"":(r.d||"");const ok=lineKind(l)==="order"?(v===""||v==="skip"):(v===""||DISPO.some(x=>x[0]===v));rows[l.id]={...r,d:ok?v:""};kept++;}});
          d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{bomId:nb.id,rows}});
          d({type:"TOAST",d:{msg:"⇄ Now on "+nb.label+(kept?" · "+kept+" line"+(kept===1?"":"s")+" carried over":""),t:Date.now()}});d({type:"BACK"});};
        return(<div className="rc-fg"><label className="rc-fl">Wrong worksheet? Swap it</label>
          <select className="rc-fi" value="" onChange={e=>{if(e.target.value)swap(e.target.value);}} style={{appearance:"none"}}><option value="">Keep {bm?bm.label:"this one"}</option>{others.map(b=>(<option key={b.id} value={b.id}>Switch to {b.label}</option>))}</select>
          <div style={{fontSize:12,color:"var(--mt)",marginTop:4}}>Measurements, part numbers and ticks on parts that appear on both worksheets come with you. Everything else starts fresh.</div></div>);})()}
      {F("bsWo","Job / WO #")}{F("bsTech","Tech")}{F("bsDate","Date in")}{F("bsDone","Date complete")}{F("bsCore","Core source")}
      {TA("bsNotes","Notes",3)}
      <div className="rc-fa">{X}<button className="rc-bs rc-bsr" onClick={()=>{d({type:"DELETE",list:"bomSheets",id:sh.id});d({type:"BACK"});}}>✕ Remove worksheet</button><button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{wo:f.bsWo||"",tech:f.bsTech||"",date:f.bsDate||"",dateDone:f.bsDone||"",coreSource:f.bsCore||"",notes:f.bsNotes||""}});d({type:"BACK"});}}>Save</button></div>
    </div>);}
  // ADD forms
  if(s.modal==="add-cust")return FM("Add Customer",[["name","Name"],["phone","Phone","tel"],["email","Email","email"],["type","Type",CUST_TYPES],["province","Province",PROV_OPTS],["vehicles","Vehicles (comma sep)"],["notes","Notes"],["tags","Tags (comma sep)"]],()=>(f.name||"").trim()&&d({type:"ADD",list:"customers",d:{...f,type:f.type||"Individual",visits:0,last:isoToday(),vehicles:(f.vehicles||"").split(",").map(v=>v.trim()).filter(Boolean),tags:(f.tags||"").split(",").map(t=>t.trim()).filter(Boolean)}}),!(""+(f.name||"")).trim()&&"Add the customer's name.");
  if(s.modal==="add-job"||s.modal==="edit-job"){const ed=s.modal==="edit-job";const kind=f.kind||(ed?jobKind(s.md||{}):"service");const svc=kind==="service";const rate=shopRate(s);const pricing=f.pricing||(ed?jobPricing(s.md||{}):"flat");const list=svcActive(s);
    const pickSvc=id=>{const x=svcById(s,id);if(!x){sf(pp=>({...pp,svcId:""}));return;}sf(pp=>({...pp,svcId:String(x.id),service:x.name,pricing:x.pricing,charge:x.pricing==="hourly"?"":String(+x.price||""),rate:x.pricing==="hourly"?String(rate||""):""}));};
    const inv=ed?jobInv(s,s.md):null;
    const ok=svc?!!(f.custId&&(f.svcId||(f.service||"").trim())):!!f.engineId;
    const save=()=>{if(!ok)return;const eng=f.engineId?engById(s,f.engineId):null;
      const base={kind,custId:svc?(+f.custId||0):0,engineId:f.engineId?+f.engineId:null,vehicle:f.vehicle||"",service:(f.service||"").trim()||(svc?"Service":"Reman — "+((eng&&(eng.name||eng.sku))||"engine")),tech:f.tech||"Unassigned",due:f.due||"",priority:f.priority||"medium",notes:f.notes||""};
      const billed=ed&&!!jobInv(s,s.md);const money=svc?{svcId:f.svcId?+f.svcId:null,pricing,charge:pricing==="hourly"&&!billed?0:(+f.charge||0),rate:pricing==="hourly"?(+f.rate||rate):0}:{svcId:null,pricing:null,charge:0,rate:0};
      if(ed){d({type:"UPDATE",list:"jobs",id:s.md.id,d:{...base,...money,status:f.status||"queued"}});d({type:"CLOSE"});}
      else d({type:"ADD",list:"jobs",d:{...base,...money,status:"queued"},label:svc?"Work order opened":"Reman job opened"});};
    return W(<div><div className="rc-mt">{ed?"Edit Work Order":"New Work Order"}</div>
      <div className="rc-fg"><label className="rc-fl">What kind of job?</label><div className="rc-seg two" role="group" aria-label="Kind of job">{[["service","Service for a customer"],["reman","Reman on our engine"]].map(([k,l])=>(<button key={k} type="button" className={kind===k?"on":""} aria-pressed={kind===k} onClick={()=>set("kind",k)}>{l}</button>))}</div>
        <p style={{fontSize:12.5,color:"var(--mt)",margin:"6px 0 0",lineHeight:1.45}}>{svc?"Work you do for a customer and charge for. Its hours are what the job costs you. They don't touch any engine's cost.":"Rebuilding an engine we own. Every hour logged lands on that engine's cost basis. Nobody is billed."}</p></div>
      {svc&&CS()}
      {svc&&(<div className="rc-fg"><label className="rc-fl">Service</label><select className="rc-fi" value={f.svcId||""} onChange={e=>pickSvc(e.target.value)} style={{appearance:"none"}}><option value="">Pick from your price list…</option>{svcCats(list).map(c=>(<optgroup key={c} label={c}>{list.filter(x=>(x.cat||"Other")===c).map(x=>(<option key={x.id} value={x.id}>{x.name}{x.pricing==="hourly"?" · hourly":(+x.price?" · "+$$(+x.price):"")}</option>))}</optgroup>))}</select></div>)}
      {F("service",svc?"Description on the work order":"What's being done")}
      {svc&&(<div className="rc-fg"><label className="rc-fl">How it's charged</label><div className="rc-seg two" role="group" aria-label="How it's charged">{[["flat","Flat price"],["hourly","By the hour"]].map(([k,l])=>(<button key={k} type="button" className={pricing===k?"on":""} aria-pressed={pricing===k} onClick={()=>set("pricing",k)}>{l}</button>))}</div>
        {pricing==="flat"?(<input className="rc-fi" type="number" placeholder="Charge to the customer ($)" value={f.charge||""} onChange={e=>set("charge",e.target.value)} style={{marginTop:8}}/>):(<div style={{marginTop:8,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><input className="rc-fi" type="number" placeholder="Rate ($/hr)" value={f.rate||""} onChange={e=>set("rate",e.target.value)} style={{width:150}}/><span style={{fontSize:13,color:"var(--mt)"}}>× hours logged{!rate&&!(+f.rate)?" · no shop rate set yet":""}</span></div>)}
        {inv&&<p style={{fontSize:12.5,color:"var(--w)",margin:"6px 0 0"}}>Already billed on {inv.invNum||inv.id}. Changing the charge here doesn't change that invoice.</p>}</div>)}
      {ES(null,svc?"Engine (optional — the one being installed)":"Engine")}
      {F("vehicle",svc?"Customer's truck / unit":"Stand / unit")}
      {TS()}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{F("due","Due")}<div className="rc-fg"><label className="rc-fl">Priority</label><select className="rc-fi" value={f.priority||"medium"} onChange={e=>set("priority",e.target.value)} style={{appearance:"none"}}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div></div>
      {ed&&(<div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" value={f.status||"queued"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}><option value="queued">Queued</option><option value="in-progress">In Progress</option><option value="complete">Complete</option></select></div>)}
      {F("notes","Notes")}
      <div className="rc-fa">{X}{!ok&&<span style={{fontSize:12.5,color:"var(--mt)",alignSelf:"center"}}>{svc?"Pick a customer and a service":"Pick the engine"}</span>}<button className="rc-ba" disabled={!ok} onClick={save}>{ed?"Save Changes":"Open Work Order"}</button></div>
    </div>);}
  if(s.modal==="add-time"){const job=s.md&&s.md.job;return W(<div><div className="rc-mt">Log Time{job&&job.service?" — "+job.service:""}</div><div className="rc-fg"><label className="rc-fl">Technician</label><select className="rc-fi" value={f.tech||""} onChange={e=>{const v=e.target.value;const emp=(s.employees||[]).find(x=>(x.nick||x.name)===v);set("tech",v);if(emp)set("rate",String(emp.rate||0));}} style={{appearance:"none"}}><option value="">Select tech...</option>{(s.employees||[]).filter(e=>e.status==="active").map(e=>(<option key={e.id} value={e.nick||e.name}>{e.name}{owner&&e.rate?` · $${e.rate}/hr`:""}</option>))}</select></div>{[["date","Date"],["hours","Hours","number"],["rate","Rate ($/hr)","number"],["notes","Notes"]].filter(([k])=>owner||k!=="rate").map(([k,l,t])=>F(k,l,t))}<div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{if(!(job&&f.tech&&+f.hours>0))return;d({type:"ADD",list:"timeEntries",d:{jobId:job.id,tech:f.tech,date:f.date||isoToday(),hours:+f.hours||0,rate:+f.rate||0,notes:f.notes||""},label:"Time logged"});d({type:"MODAL",v:"job-detail",d:job});}}>Save</button></div></div>);}
  if(s.modal==="sku-renumber"){const engs=(s.inventory||[]).filter(isEngine).sort((a,b)=>(+a.id||0)-(+b.id||0));const others=(s.inventory||[]).filter(x=>!isEngine(x)).flatMap(x=>[x.sku,...(x.oldSkus||[])]).concat(engs.flatMap(x=>x.oldSkus||[])).filter(Boolean);
    const plan=renumberPlan(engs,engSkuPrefix,others);const byId=new Map(engs.map(e=>[String(e.id),e]));
    return W(<div><div className="rc-mt">Renumber SKUs</div>
      <p className="rc-qr-p">Every engine gets <b>RC-</b> + brand + family + year + a counter, like <b>RC-CUISX2021-001</b>: a two-letter brand (CU Cummins, CA Caterpillar, DE Detroit, IN International, PA Paccar, MB Mercedes-Benz, MA Mack, VO Volvo, JD John Deere, FO Ford, DM Duramax, HI Hino, IS Isuzu, DZ Deutz, YA Yanmar, PE Perkins, KU Kubota, XX unknown), the family without its size (ISX15 → ISX), the year (0000 when it's missing) and a number counted per prefix. No two engines get the same SKU, and a number is never reused.</p>
      <div className="rc-qr-bar"><span>{plan.length} engine{plan.length===1?"":"s"} get a new SKU · {engs.length-plan.length} already right</span></div>
      {plan.length===0?<div className="rc-qr-p">Every engine already has its RC- SKU.</div>:<div className="rc-qr-list">{plan.map(p=>{const e=byId.get(String(p.id))||{};return(<div key={p.id} className="rc-sku-row"><span className="nm">{e.name||"Engine"}</span><span className="old">{p.from||"no SKU"}</span><span className="arr" aria-hidden="true">→</span><b>{p.to}</b></div>);})}</div>}
      <div className="rc-qr-note">The old SKU stays on each engine: searching for it, a timesheet note that mentions it and old sales still find the engine. QR codes keep working (they use the engine itself, not the SKU), but reprint the tags so the printed SKU matches. An engine with no year gets 0000: add the year and use ↻ in Edit to give it its real number.</div>
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!plan.length} onClick={()=>{plan.forEach(p=>d({type:"UPDATE",list:"inventory",id:byId.get(String(p.id)).id,d:{sku:p.to}}));d({type:"CLOSE"});d({type:"TOAST",d:{msg:"New SKUs on "+plan.length+" engine"+(plan.length===1?"":"s")+". The old ones still find them in search.",t:Date.now(),long:true}});}}>Apply to {plan.length} engine{plan.length===1?"":"s"}</button></div></div>);}
  if(s.modal==="qr-tags"){const all=(s.inventory||[]).filter(isEngine);const pool=s.md&&s.md.ids?all.filter(i=>s.md.ids.some(x=>sameId(x,i.id))):all.filter(i=>engStatus(i)!=="sold").sort((a,b)=>String(a.sku||"").localeCompare(String(b.sku||""),undefined,{numeric:true}));const off=f.qrOff||{};const pick=pool.filter(i=>!off[i.id]);const one=pool.length===1?pool[0]:null;
    return W(<div><div className="rc-mt">{one?"QR tag":"QR tags"}</div>
      <p className="rc-qr-p">Scan a tag with a phone's camera and it opens that engine's record here: make, model, year, HP and the parts on it. Whoever scans signs in first, so nothing is public.</p>
      {one?(<div className="rc-qr-one"><div className="rc-qr-img" aria-label={"QR code for "+(one.sku||one.name)} role="img" dangerouslySetInnerHTML={{__html:qrPrev}}/><div style={{minWidth:0}}><div className="rc-ml">{one.sku||"Engine"}</div><div className="rc-tn">{[engMake(one),engModel(one)].filter(x=>x&&x!=="—").join(" ")||one.name}</div><div style={{fontSize:13.5,color:"var(--tx2)",marginTop:2}}>{[engYear(one),hpTxt(one),(one.serial||one.esn)?"ESN "+(one.serial||one.esn):""].filter(Boolean).join(" · ")||"Add the year and HP on Edit"}</div><div className="rc-qr-url">{engineUrl(one.id)}</div></div></div>)
      :pool.length===0?<div className="rc-qr-p">No engines on the lot to tag.</div>
      :(<><div className="rc-qr-bar"><span>{pick.length} of {pool.length} picked</span><button className="rc-lnk" onClick={()=>set("qrOff",{})}>All</button><button className="rc-lnk" onClick={()=>set("qrOff",Object.fromEntries(pool.map(i=>[i.id,1])))}>None</button></div>
        <div className="rc-qr-list">{pool.map(i=>(<label key={i.id} className="rc-qr-row"><input type="checkbox" checked={!off[i.id]} onChange={e=>set("qrOff",{...off,[i.id]:e.target.checked?0:1})}/><b>{i.sku||"—"}</b><span>{i.name}</span></label>))}</div></>)}
      <div className="rc-qr-note">Tags print ten to a Letter page, 3.5 × 2 in each, with cut lines. Use weatherproof label stock or laminate them for the carport.</div>
      {WHY(pick.length?"":"Pick at least one engine.")}
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!pick.length} onClick={async()=>{const ok=await printQrTags(pick);if(!ok)d({type:"TOAST",d:{msg:"The browser blocked the print window. Allow pop-ups for this site, then try again.",t:Date.now(),long:true}});}}>🖨 Print {pick.length===1?"tag":pick.length+" tags"}</button></div></div>);}
  if(s.modal==="part-detail"){const i=engById(s,s.md&&s.md.id)||s.md;const eng=isEngine(i);const cb=costBasis(i);const tm=trueMargin(i);const mp=marginPct(i);
    if(!eng){return W(<div><div className="rc-mt">{i.name}</div>{i.photo&&<img src={i.photo} alt="" style={{width:"100%",maxHeight:240,objectFit:"cover",borderRadius:5,border:"1px solid var(--ln)",marginBottom:12}}/>}<div className="rc-3c" style={{marginBottom:12}}><div><div className="rc-ml">SKU</div><div className="rc-mv" style={{fontSize:14.5}}>{i.sku}</div></div><div><div className="rc-ml">Price</div><div className="rc-mv" style={{color:"var(--act)"}}>{i.price>0?$$(i.price):"Core"}</div></div><div><div className="rc-ml">Qty</div><div className="rc-mv">{i.qty}</div></div></div>{i.notes&&<div className="rc-fg"><div className="rc-fl">Notes</div><div style={{fontSize:14,color:"var(--tx2)"}}>{i.notes}</div></div>}<div className="rc-fa">{C}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-part",d:i})}>✎ Edit</button></div></div>);}
    const lk=engLinks(s,i.id);const cur=engStatus(i);
    const Lrec=(icon,col,label,val,sub,subcol,go)=>(<button type="button" className="rc-card rc-lrec" onClick={go} disabled={!go} style={{padding:11,display:"flex",gap:9,alignItems:"flex-start"}}><span style={{fontSize:16.5,color:col}}>{icon}</span><div style={{flex:1,minWidth:0}}><div className="rc-ml">{label}</div><div style={{fontSize:14,marginTop:1}}>{val}</div>{sub&&<div style={{fontSize:12,color:subcol||"var(--tx2)",marginTop:2}}>{sub}</div>}</div></button>);
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>Engine Unit Record</div><div style={{fontSize:12,color:"var(--mt)",letterSpacing:1,marginBottom:12}}>{i.sku}</div>
      <div style={{display:"flex",gap:12,marginBottom:14}}>{i.photo?<img src={i.photo} alt="" style={{width:84,height:84,objectFit:"cover",borderRadius:6,border:"1px solid var(--ln)",flexShrink:0}}/>:<div onClick={()=>d({type:"MODAL",v:"edit-part",d:i})} style={{width:84,height:84,borderRadius:6,border:"1px dashed var(--ln)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"var(--ft)",flexShrink:0,cursor:"pointer"}}>📷</div>}<div style={{flex:1}}><div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:21,lineHeight:1.05}}>{i.name}</div><div style={{fontSize:13,color:"var(--tx2)",margin:"3px 0 4px"}}>ESN {i.serial||i.esn||"—"}{i.cpl?` · CPL ${i.cpl}`:""}</div>{(()=>{const lo=engLocs(s).get(i.id);return lo?<button className="rc-lnk rc-s3-pass" onClick={()=>{d({type:"CLOSE"});d({type:"TAB",v:"shop3d",focus:i.id});}}>📍 {areaTitle(lo)} · Show in 3D</button>:<div style={{height:4}}/>;})()}<Badge s={cur}/></div></div>
      {(()=>{const lv=uwLevel(i);if(!lv)return null;const r=Math.round(uwRatio(i)*100);return(<div style={{border:"1px solid "+(lv==="crit"?"var(--r)":"var(--w)"),background:lv==="crit"?"var(--rs)":"var(--ws)",color:lv==="crit"?"var(--r)":"var(--w)",borderRadius:9,padding:"9px 12px",fontSize:13,marginBottom:12,fontWeight:600,lineHeight:1.5}}>⚠ {lv==="crit"?"UNDERWATER":"MARGIN RISK"} — cost is {r}% of the {$$(+i.price)} expected sale. Finish, part out, or sell as-is — decide before the next dollar goes in.</div>);})()}
      {(()=>{const dxN=dxFor(s,i.id).length;const bsh=sheetFor(s,i.id);const bbm=bsh?bomById(s,bsh.bomId):null;const bst=bbm?bomStats(bbm,bsh):null;return(<div style={{display:"flex",gap:6,marginBottom:12,paddingBottom:10,borderBottom:"1px solid var(--ln)",flexWrap:"wrap"}}>{[["overview","Overview"],["costs","Costs · "+$K(cb)],["bom","BOM"+(bst?(bst.ordered&&bst.signed?" · ✓":" · open"):"")],["diagnosis","Diagnosis"+(dxN?" · "+dxN:"")],["sell","Sell"]].map(([k,l])=>(<button key={k} className={"rc-fb"+(ptab===k?" on":"")} onClick={()=>setPtab(k)}>{l}</button>))}</div>);})()}
      {ptab==="overview"&&(<>
      <div className="rc-fl" style={{marginBottom:6}}>Engine identity</div>
      <div className="rc-card" style={{marginBottom:12,padding:12}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px 8px"}}><div><div className="rc-ml">Make</div><div style={{fontSize:14}}>{engMake(i)||"—"}</div></div><div><div className="rc-ml">Model</div><div style={{fontSize:14}}>{engModel(i)}</div></div><div><div className="rc-ml">Stock #</div><div style={{fontSize:14}}>{i.sku||"—"}</div>{(i.oldSkus||[]).length>0&&<div style={{fontSize:12,color:"var(--mt)"}}>was {i.oldSkus.join(", ")}</div>}</div><div><div className="rc-ml">Arrangement</div><div style={{fontSize:14}}>{i.arrangement||"—"}</div></div><div><div className="rc-ml">Year</div><div style={{fontSize:14}}>{engYear(i)||"—"}</div></div><div><div className="rc-ml">Rated HP</div><div style={{fontSize:14}}>{i.ratedHp||"—"}</div></div><div><div className="rc-ml">Oil Cap</div><div style={{fontSize:14}}>{i.oilCap||"—"}</div></div><div><div className="rc-ml">Condition</div><div style={{fontSize:14}}>{i.condition||"—"}</div></div><div><div className="rc-ml">Source Core</div><div style={{fontSize:14,color:"var(--tx2)"}}>{i.sourceCore||"—"}</div></div></div></div>
      {(()=>{const PL=enginePartsList(s,i);const groups=[["New parts",PL.fresh],["Reused, measured in spec",PL.kept],["At the machine shop",PL.mach],["Bought for this engine",PL.logged]].filter(([,l])=>l.length);
        return(<><div className="rc-fl" style={{marginBottom:6}}>Parts on this engine</div><div className="rc-card rc-eparts">{groups.length===0?<div className="rc-eparts-none">No parts recorded yet. They show here from the engine's BOM worksheet (new, reused, machine shop) and the parts log on the Costs tab.</div>
          :groups.map(([g,l])=>(<div key={g} className="rc-eparts-g"><div className="rc-eparts-h">{g} · {l.length}</div>{l.map((p,k)=>(<div key={k} className="rc-eparts-r"><span>{p.part}</span>{+p.qty>1?<small>× {p.qty}</small>:null}{p.note?<small>{p.note}</small>:null}</div>))}</div>))}
          {PL.bom&&<div className="rc-eparts-src">From the {PL.bom.label} worksheet{PL.signed?"":" · decisions not signed off yet, so only ordered and missing parts count as new"}</div>}</div></>);})()}
      <div className="rc-card" style={{marginBottom:12,padding:12}}><div className="rc-3c"><div><div className="rc-ml">Total in</div><div className="rc-mv">{$$(cb)}</div></div><div><div className="rc-ml">List price</div><div className="rc-mv" style={{color:"var(--act)"}}>{i.price>0?$$(i.price):"—"}</div></div><div><div className="rc-ml">True margin</div><div className="rc-mv" style={{color:tm>0?"var(--g)":"var(--r)"}}>{i.price>0?$$(tm)+" · "+mp.toFixed(0)+"%":"—"}</div></div></div><div style={{fontSize:11,color:"var(--mt)",marginTop:8}}>Full breakdown, parts and labor live on the <span style={{color:"var(--act)",cursor:"pointer"}} onClick={()=>setPtab("costs")}>Costs tab →</span></div></div>
      </>)}
      {ptab==="costs"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:10,marginBottom:12}}>
        <div className="rc-card" style={{padding:12}}><div className="rc-fl" style={{marginBottom:7}}>Cost basis</div><div style={{fontSize:13.5}}>{(()=>{const flat=(+i.costCore||0)+(+i.costFreight||0)+(+i.costParts||0)+(+i.costLabor||0)===0;const rows=[...(flat?[["Flat cost (acquisition)",i.cost]]:[["Core purchase",i.costCore],["Inbound freight",i.costFreight],["Parts kit (flat)",i.costParts]]),["Parts (itemized)",partsSpend(i)],["Diagnosis parts",i.dxParts],...(flat?[]:[["Machine + assembly (flat)",i.costLabor]]),["Labor (logged)",i.laborLogged]];return (rows.some(([l,v])=>+v>0)&&!(flat&&rows.filter(([l,v])=>+v>0).length===1&&+i.cost>0))?(<>{rows.filter(([l,v])=>l!=="Diagnosis parts"||+v>0).map(([l,v],x)=>(<div key={x} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",color:(l==="Parts (itemized)"||l==="Labor (logged)"||l==="Diagnosis parts")&&+v>0?"var(--w)":"var(--tx2)"}}><span>{l}</span><span>{$$(+v||0)}</span></div>))}<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0 0",marginTop:4,borderTop:"1px solid var(--ln)",fontWeight:600}}><span style={{color:"var(--tx2)"}}>Total in this engine</span><span>{$$(cb)}</span></div></>):(<div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{color:"var(--tx2)"}}>Flat cost</span><span style={{fontWeight:600}}>{$$(cb)}</span></div>);})()}</div></div>
        <div className="rc-card" style={{padding:12,display:"flex",flexDirection:"column",justifyContent:"center",gap:9}}><div><div className="rc-ml">Sell price</div><div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:21,color:"var(--act)"}}>{i.price>0?$$(i.price):"Core"}</div></div><div style={{borderTop:"1px solid var(--ln)",paddingTop:7}}><div className="rc-ml">True margin</div><div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:21,color:tm>0?"var(--g)":"var(--r)"}}>{i.price>0?$$(tm):"—"}{i.price>0&&<span style={{fontSize:14}}> · {mp.toFixed(0)}%</span>}</div></div>{cb>0&&(()=>{const sug=Math.ceil(cb/0.7/50)*50;return(<div style={{borderTop:"1px solid var(--ln)",paddingTop:7}}><div className="rc-ml">Suggested list · 30% margin</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:18,color:"var(--w)"}}>{$$(sug)}</span>{i.price!==sug&&<button className="rc-bs" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>{d({type:"UPDATE",list:"inventory",id:i.id,d:{price:sug}});d({type:"MODAL",v:"part-detail",d:{...i,price:sug}});}}>Set</button>}</div></div>);})()}</div>
      </div>
      <div className="rc-fl" style={{marginBottom:6}}>Reman parts log <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0}}>— log parts as you buy them into this engine</span></div>
      <div className="rc-card" style={{marginBottom:12,padding:12}}>
        {(i.partsLog||[]).length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:8}}>Nothing yet. Every part you add here rolls into the cost basis automatically — so you always know what's in this engine.</div>):(i.partsLog||[]).map((p,x)=>(<div key={x} style={{display:"flex",gap:8,alignItems:"center",padding:"3px 0",borderBottom:"1px solid var(--ln2)",fontSize:13}}><span style={{color:"var(--mt)",fontSize:11,width:66,flexShrink:0}}>{p.date||""}</span><span style={{flex:1,minWidth:0}}>{p.d}</span><span style={{fontWeight:600,width:70,textAlign:"right"}}>{$$(+p.v||0)}</span><button className="rc-bs rc-bsr" style={{fontSize:12,padding:"1px 6px"}} onClick={()=>{const nl=(i.partsLog||[]).filter((_,y)=>y!==x);d({type:"UPDATE",list:"inventory",id:i.id,d:{partsLog:nl}});d({type:"MODAL",v:"part-detail",d:{...i,partsLog:nl}});}}>×</button></div>))}
        {(i.partsLog||[]).length>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0 8px",fontSize:13,fontWeight:700}}><span style={{color:"var(--tx2)"}}>Parts total</span><span style={{color:"var(--w)"}}>{$$(partsSpend(i))}</span></div>}
        <div style={{display:"flex",gap:6,marginTop:4}}>
          <input className="rc-fi" placeholder="Part bought (e.g. injector set, turbo)" value={f.plD||""} onChange={e=>set("plD",e.target.value)} style={{flex:2}}/>
          <input className="rc-fi" type="number" placeholder="$" value={f.plV||""} onChange={e=>set("plV",e.target.value)} style={{flex:.7}}/>
          <button className="rc-ba" style={{padding:"6px 12px",fontSize:13}} onClick={()=>{const v=+f.plV||0;const dd=(f.plD||"").trim();if(!dd||v<=0)return;const nl=[...(i.partsLog||[]),{d:dd,v,date:isoToday()}];d({type:"UPDATE",list:"inventory",id:i.id,d:{partsLog:nl}});set("plD","");set("plV","");d({type:"MODAL",v:"part-detail",d:{...i,partsLog:nl}});}}>+ Add</button>
        </div>
      </div>
      <div className="rc-fl" style={{marginBottom:6}}>Reman labor <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0}}>— logged hours land on this engine automatically</span></div>
      <div className="rc-card" style={{marginBottom:12,padding:12}}>
        {(()=>{const ejs=(s.jobs||[]).filter(j=>j.engineId===i.id&&jobKind(j)==="reman");
          return(<>
            {ejs.length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:8}}>No work order yet. Open one — every hour a tech logs on it lands on this engine's cost.</div>):ejs.map(j=>{const te=(s.timeEntries||[]).filter(t=>t.jobId===j.id);const h=te.reduce((a,t)=>a+(+t.hours||0),0);const v=te.reduce((a,t)=>a+(+t.hours||0)*(+t.rate||0),0);return(<div key={j.id} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--ln2)",fontSize:13}}><span style={{flex:1,minWidth:0}}>{j.service||"Job"}</span><Badge s={j.status}/><span style={{width:44,textAlign:"right",color:"var(--tx2)"}}>{h}h</span><span style={{width:70,textAlign:"right",fontWeight:600}}>{$$(v)}</span><button className="rc-bs" style={{fontSize:11,padding:"2px 7px"}} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})}>Open</button></div>);})}
            {(+i.laborLogged||0)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0 8px",fontSize:13,fontWeight:700}}><span style={{color:"var(--tx2)"}}>Labor total</span><span style={{color:"var(--w)"}}>{$$(+i.laborLogged||0)}</span></div>}
            <button className="rc-bs" style={{marginTop:4}} onClick={()=>{const nj={id:Date.now(),kind:"reman",engineId:i.id,custId:0,vehicle:i.sku||"",service:"Reman — "+(i.name||i.sku||"engine"),type:"Reman",tech:"Unassigned",due:"",priority:"medium",status:"in-progress",notes:""};d({type:"ADD",list:"jobs",d:nj,label:"Reman job opened"});d({type:"MODAL",v:"job-detail",d:nj});}}>🔧 + Reman Job</button>
          </>);})()}
      </div>
      </>)}
      {ptab==="diagnosis"&&(<>
      <div className="rc-fl" style={{marginBottom:6}}>Diagnosis history <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0}}>— what's been found on this unit</span></div>
      <div className="rc-card" style={{marginBottom:12,padding:12}}>
        {(()=>{const dxs=dxFor(s,i.id);const kn=issuesFor(s,i);return(<>
          {dxs.length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:4}}>Nothing logged yet. Every symptom, finding and fix on this unit lives here — and feeds the shop's common-issues database.</div>):dxs.map(x=>(<div key={x.id} onClick={()=>d({type:"MODAL",v:"dx-detail",d:x})} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--ln2)",fontSize:13,cursor:"pointer"}}><span style={{color:"var(--mt)",fontSize:11,width:66,flexShrink:0}}>{x.date||""}</span><span style={{flex:1,minWidth:0}}><span style={{color:"var(--tx)"}}>{(x.symptoms||[]).join(", ")||"—"}</span>{x.codes&&<span style={{color:"var(--tx2)"}}> · {x.codes}</span>}{x.findings&&<div style={{color:"var(--tx2)",fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.findings}</div>}</span>{x.tech&&<span style={{color:"var(--act)",fontSize:12}}>{x.tech}</span>}<Badge s={x.outcome||"open"}/></div>))}
          <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center",flexWrap:"wrap"}}><button className="rc-ba" style={{padding:"6px 12px",fontSize:13}} onClick={()=>d({type:"MODAL",v:"add-dx",d:{engineId:i.id,engineName:i.name,back:true,prefill:{date:isoToday()}}})}>🩺 + Log Diagnosis</button>{kn.length>0&&<span style={{fontSize:12,color:"var(--tx2)"}}>{kn.length} known issue{kn.length>1?"s":""} for {familyLabel(i)}</span>}</div>
          {kn.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>{kn.slice(0,4).map(is=>(<button key={is.id} className="rc-fb" onClick={()=>d({type:"MODAL",v:"issue-detail",d:is})} style={{borderColor:tint(sevCol(is.severity),53),color:sevCol(is.severity),textTransform:"none",letterSpacing:0,fontSize:12,textAlign:"left"}}>{is.title}</button>))}{kn.length>4&&<button className="rc-fb" onClick={()=>{d({type:"CLOSE"});d({type:"TAB",v:"issues"});}} style={{fontSize:12}}>+{kn.length-4} more →</button>}</div>}
        </>);})()}
      </div>
      {(()=>{const ej=ecmFor(s,i.id);return(<>
      <div className="rc-fl" style={{marginBottom:6}}>ECM jobs <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0}}>— programming and calibration on this unit</span></div>
      <div className="rc-card" style={{marginBottom:12,padding:12}}>
        {ej.length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:4}}>None yet.</div>):ej.map(x=>(<div key={x.id} onClick={()=>d({type:"MODAL",v:"ecm-job",d:{id:x.id}})} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"1px solid var(--ln2)",fontSize:13,cursor:"pointer"}}><span style={{color:"var(--mt)",fontSize:12,width:80,flexShrink:0}}>{x.date||""}</span><span style={{flex:1,minWidth:0}}>{(x.types||[]).map(ecmTypeLabel).join(", ")||"ECM job"}{x.custId?<span style={{color:"var(--tx2)"}}> · {cn(s.customers,+x.custId)}</span>:null}</span>{x.billTo==="warranty"&&<span style={{fontSize:11.5,color:"var(--mt)",fontWeight:600,letterSpacing:.5}}>WARRANTY</span>}<Badge s={x.status||"intake"}/></div>))}
        <button className="rc-bs" style={{marginTop:8}} onClick={()=>newEcmFor(i)}>🖥 + ECM Job</button>
      </div></>);})()}
      </>)}
      {ptab==="bom"&&(()=>{const sh=sheetFor(s,i.id);const bm=sh?bomById(s,sh.bomId):null;
        if(!sh||!bm){const cands=bomsFor(s,i);return(<>
          <div className="rc-fl" style={{marginBottom:6}}>Long block worksheet</div>
          <div className="rc-card" style={{marginBottom:12,padding:12}}>
            <div style={{fontSize:13,color:"var(--mt)",marginBottom:10,lineHeight:1.5}}>Two pages, same as the paper form. The parts order goes out the day the job opens — no ticking, no waiting on teardown. The decision sheet gets worked through teardown: reuse, missing or machine shop, and anything left blank gets replaced.</div>
            {(()=>{const start=b=>{d({type:"ADD",list:"bomSheets",d:{engineId:i.id,bomId:b.id,engName:i.name||i.sku||"",date:isoToday(),tech:"",wo:"",coreSource:i.sourceCore||"",rows:newRows(b),notes:""},label:"Worksheet started — parts order ready to go"});d({type:"MODAL",v:"part-detail",d:{...i,ptab:"bom"}});};
              const others=(s.boms||[]).filter(b=>!cands.some(c=>c.id===b.id));
              if(cands.length)return cands.map(b=>(<button key={b.id} className="rc-ba" style={{padding:"7px 13px",fontSize:13,marginRight:6,marginBottom:6}} onClick={()=>start(b)}>Start {b.label} →</button>));
              return(<><div style={{fontSize:13,color:"var(--w)",marginBottom:9,lineHeight:1.5}}>No worksheet is matched to {familyLabel(i)} yet.{others.length>0?" Start from one of these anyway, or build one for this family.":""}</div>
                {others.map(b=>(<button key={b.id} className="rc-bs" style={{marginRight:6,marginBottom:6}} onClick={()=>start(b)}>Use {b.label} anyway →</button>))}
                <button className="rc-ba" style={{padding:"7px 13px",fontSize:13,marginBottom:6}} onClick={()=>d({type:"TAB",v:"boms"})}>Build one for {familyLabel(i)} →</button></>);})()}
          </div></>);}
        const st=bomStats(bm,sh);const fil=f.bfil||"all";
        const setRow=(lid,patch)=>{const rows={...(sh.rows||{})};rows[lid]={...(rows[lid]||{}),...patch};d({type:"UPDATE",list:"bomSheets",id:sh.id,d:{rows}});};
        const setSh=p=>d({type:"UPDATE",list:"bomSheets",id:sh.id,d:p});
        const vis=l=>{const k=lineKind(l),v=rowD(sh,l);if(fil==="all")return true;if(fil==="order")return k==="order";if(fil==="decide")return k==="decide";if(fil==="blank")return k==="decide"&&!v;return k==="decide"&&v===fil;};
        const statusRow=(lab,ok,txt,btn)=>(<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"7px 10px",borderRadius:9,border:"1px solid "+(ok?"var(--g)":"var(--ln)"),background:ok?"var(--gs)":"transparent"}}><span style={{fontSize:11,letterSpacing:1.4,textTransform:"uppercase",color:"var(--tx2)",width:92,flexShrink:0}}>{lab}</span><span style={{flex:1,minWidth:150,fontSize:13,color:ok?"var(--g)":"var(--tx)",lineHeight:1.45}}>{txt}</span>{btn}</div>);
        return(<>
        <div className="rc-card" style={{padding:12,marginBottom:10}}>
          <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:15,letterSpacing:1,marginBottom:9}}>{bm.label}<span style={{color:"var(--mt)",fontSize:12,fontWeight:400,marginLeft:6}}>rev {bm.rev}</span></div>
          <div style={{display:"grid",gap:7}}>
            {statusRow("Parts order",st.ordered,st.ordered?"✓ Ordered "+sh.orderedDate+(sh.orderedBy?" by "+sh.orderedBy:"")+(sh.po?" · PO "+sh.po:""):<span style={{color:"var(--w)"}}>Not ordered yet — {st.order} line{st.order===1?"":"s"}, goes out the day the job opens</span>,<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"bom-shop",d:{engineId:i.id}})}>🛒 {st.ordered?"View order":"Open the order"}</button>)}
            {statusRow("Decisions",st.signed,st.signed?"✓ Signed off "+sh.decidedAt+(sh.decidedBy?" by "+sh.decidedBy:"")+" — "+st.repl+" to replace":st.ticked+" ticked · "+st.open+" still blank — blanks become replacements when you sign off",st.signed?<button className="rc-bs" onClick={()=>setSh({decidedAt:"",decidedBy:""})}>Reopen</button>:<button className="rc-ba" style={{padding:"6px 12px",fontSize:13}} onClick={()=>{setSh({decidedAt:isoToday(),decidedBy:sh.tech||CURRENT_USER});d({type:"TOAST",d:{msg:"✓ Decision sheet signed off — "+st.open+" blank line"+(st.open===1?"":"s")+" go on the order to replace",t:Date.now()}});}}>✓ Sign off</button>)}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>{DISPO.map(([k,lab,col])=>(<span key={k} style={{fontSize:11.5,color:col,border:"1px solid "+col,borderRadius:20,padding:"2px 9px",letterSpacing:.5}}>{lab} {st[k]}</span>))}<span style={{fontSize:11.5,color:st.signed?"var(--w)":"var(--tx2)",border:"1px solid "+(st.signed?"var(--w)":"var(--ln)"),borderRadius:20,padding:"2px 9px",letterSpacing:.5}}>{st.signed?"REPLACE "+st.repl:"BLANK "+st.open}</span></div>
          <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
            <button className="rc-bs" onClick={()=>d({type:"MODAL",v:"bom-mach",d:{engineId:i.id}})}>⚙ Machine shop{st.mach?" · "+st.mach:""}</button>
            <button className="rc-bs" onClick={()=>d({type:"MODAL",v:"bom-sheet",d:{engineId:i.id}})}>✎ Sheet info</button>
            <button className="rc-bs rc-bsr" title="Take this worksheet off the engine — undo from the toast" onClick={()=>d({type:"DELETE",list:"bomSheets",id:sh.id})}>✕ Remove worksheet</button>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{[["all","All "+st.total],["order","Parts order "+(st.order+st.skip)],["decide","Decisions "+st.decide],["reuse","Reuse "+st.reuse],["miss","Missing "+st.miss],["mach","Machine "+st.mach],["blank",(st.signed?"Replace ":"Blank ")+(st.signed?st.repl:st.open)]].map(([k,l])=>(<button key={k} className={"rc-fb"+(fil===k?" on":"")} onClick={()=>set("bfil",k)}>{l}</button>))}</div>
        {bomSecs(bm).map(sec=>{const ls=(bm.lines||[]).filter(l=>l.sec===sec&&vis(l));if(!ls.length)return null;const isOrd=ls.every(l=>lineKind(l)==="order");return(<div key={sec} className="rc-card" style={{marginBottom:9,padding:"9px 11px"}}>
          <div className="rc-fl" style={{marginBottom:5,display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><span>{sec}</span><span style={{textTransform:"none",letterSpacing:0,color:"var(--mt)",fontWeight:400}}>{isOrd?"always new · no ticking · strike what's not on this job":"reuse · missing · machine — blank means replace"}</span></div>
          {ls.map(l=>{const r=sheetRow(sh,l.id);const v=rowD(sh,l);const ord=lineKind(l)==="order";const off=ord&&v==="skip";return(<div key={l.id} style={{display:"flex",gap:5,alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--ln2)",flexWrap:"wrap",opacity:off?.5:1}}>
            <span style={{width:30,flexShrink:0,textAlign:"right",fontSize:11,color:"var(--mt)"}}>{l.qty}</span>
            <span style={{flex:1,minWidth:130}}><span style={{fontSize:13,textDecoration:off?"line-through":"none"}}>{l.part}</span>{(r.meas||r.pn||l.note)&&<div style={{fontSize:11,color:(r.meas||r.pn)?"var(--g)":"var(--mt)",marginTop:1}}>{[r.pn&&("PN "+r.pn),r.meas||l.note].filter(Boolean).join(" · ")}</div>}</span>
            {ord?(<button className="rc-fb" onClick={()=>setRow(l.id,{d:off?"":"skip"})} style={{fontSize:12,padding:"3px 7px",letterSpacing:.5}}>{off?"↺ put back":"✕ not on this job"}</button>):(<>
              {!v&&<span style={{fontSize:12,letterSpacing:.5,color:st.signed?"var(--w)":"var(--mt)",marginRight:2}}>{st.signed?"→ REPLACE":"blank"}</span>}
              {DISPO.map(([k,lab,col])=>(<button key={k} className="rc-fb" onClick={()=>setRow(l.id,{d:v===k?"":k})} style={{fontSize:12,padding:"3px 7px",letterSpacing:.5,...(v===k?{borderColor:col,color:col,background:tint(col,14)}:{})}}>{lab}</button>))}</>)}
            <button className="rc-fb" title="Measurement, part number, buy link" onClick={()=>d({type:"MODAL",v:"bom-note",d:{engineId:i.id,lineId:l.id,part:l.part}})} style={{fontSize:12,padding:"3px 7px"}}>✎</button>
          </div>);})}
        </div>);})}
        <div className="rc-card" style={{padding:11,marginBottom:12,fontSize:12,color:"var(--tx2)",lineHeight:1.6}}>{bm.rule}{bm.watch&&<div style={{marginTop:6,color:"var(--w)"}}>{bm.watch}</div>}</div>
        </>);})()}
      {ptab==="overview"&&(<>
      <div className="rc-fl" style={{marginBottom:6}}>Lifecycle status</div>
      <div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap",marginBottom:14}}>{ENG_STATUSES.map((st,x)=>(<React.Fragment key={st}><button onClick={()=>{d({type:"UPDATE",list:"inventory",id:i.id,d:{status:st}});d({type:"MODAL",v:"part-detail",d:{...i,status:st}});}} className="rc-fb" style={cur===st?{borderColor:BC[st]||"var(--ac)",color:BC[st]||"var(--ac)",background:tint(BC[st]||"var(--ac)",8)}:{}}>{engStatusLabel(st)}</button>{x<ENG_STATUSES.length-1&&<span style={{color:"var(--ft)",fontSize:13}}>›</span>}</React.Fragment>))}</div>
      </>)}
      {ptab==="sell"&&(<>
      <div className="rc-fl" style={{marginBottom:6}}>Advertised on <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0}}>— tap to toggle</span></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{CHANNELS.map(c=>{const on=(i.listedOn||[]).includes(c.k);return <button key={c.k} className="rc-fb" onClick={()=>{const cur=i.listedOn||[];const next=on?cur.filter(x=>x!==c.k):[...cur,c.k];d({type:"UPDATE",list:"inventory",id:i.id,d:{listedOn:next}});d({type:"MODAL",v:"part-detail",d:{...i,listedOn:next}});}} style={on?{borderColor:c.col,color:c.col,background:tint(c.col,8)}:{}}>{on?"✓ ":""}{c.l}</button>;})}</div>
      <div className="rc-fl" style={{marginBottom:6}}>Linked records</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:6}}>
        {lk.invoice?Lrec("🧾","var(--b)","Invoice",lk.invoice.invNum,$$(invTot(lk.invoice))+" · "+Mny.invStatus(lk.invoice),BC[Mny.invStatus(lk.invoice)],()=>d({type:"MODAL",v:"inv-detail",d:lk.invoice})):Lrec("🧾","var(--ln)","Invoice","Not linked","+ Make one",null,()=>d({type:"MODAL",v:"add-inv",d:{engineId:i.id,engineName:i.name}}))}
        {lk.core?Lrec("🔄","var(--w)","Core",$$(lk.core.deposit||0)+" dep",engStatusLabel(lk.core.status)+(lk.core.dueDate?" · due "+lk.core.dueDate:""),BC[lk.core.status],()=>d({type:"MODAL",v:"edit-core",d:lk.core})):Lrec("🔄","var(--ln)","Core","Not linked","+ Track the core return",null,()=>d({type:"MODAL",v:"add-core",d:{engineId:i.id,engineName:i.name}}))}
        {lk.warranty?Lrec("🛡","var(--g)","Warranty",lk.warranty.warrantyPeriod||"—",lk.warranty.status+(lk.warranty.expiryDate?" · exp "+lk.warranty.expiryDate:""),BC[lk.warranty.status],()=>d({type:"MODAL",v:"edit-warranty",d:lk.warranty})):Lrec("🛡","var(--ln)","Warranty","Not linked","+ Add a warranty",null,()=>d({type:"MODAL",v:"add-warranty",d:{engineId:i.id,engineName:i.name}}))}
        {lk.shipment?Lrec("🚚","var(--b)","Shipment",lk.shipment.carrier,(lk.shipment.deliveryConfirmed?"Delivered":"In transit")+(lk.shipment.destination?" · "+lk.shipment.destination:""),lk.shipment.deliveryConfirmed?"var(--g)":"var(--b)",()=>d({type:"MODAL",v:"edit-ship",d:lk.shipment})):Lrec("🚚","var(--ln)","Shipment","Not linked","+ Add the shipment",null,()=>d({type:"MODAL",v:"add-ship",d:{engineId:i.id,engineName:i.name}}))}
      </div>
      {(()=>{const sj=(s.jobs||[]).filter(j=>+j.engineId===i.id&&jobKind(j)==="service");const inv=lk.invoice;const engLine=inv?((inv.items||[]).find(x=>x.kind==="engine")||(inv.items||[]).find(x=>!x.svcId&&!x.jobId)):null;const engAmt=engLine?(+engLine.q||0)*(+engLine.r||0):(+i.price||0);const svcAmt=sj.reduce((a,j)=>a+jobCharge(s,j),0);
        return(<>
        <div className="rc-fl" style={{margin:"14px 0 6px"}}>Services with this engine <span style={{color:"var(--ft)",textTransform:"none",letterSpacing:0,fontWeight:400}}>— the swap and anything else sold with it</span></div>
        <div className="rc-card" style={{padding:12,marginBottom:12}}>
          {sj.length===0?(<div style={{fontSize:13,color:"var(--mt)",marginBottom:8}}>Nothing yet. Selling it with an engine swap? Sell Engine adds the swap, or add a service here.</div>):sj.map(j=>(<div key={j.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--ln2)",fontSize:13.5,flexWrap:"wrap"}}><span style={{flex:1,minWidth:150}}>{j.service}<span style={{display:"block",fontSize:12,color:"var(--mt)"}}>{jobCust(s,j)} · {jobHours(s,j)}h logged{jobInv(s,j)?" · billed":""}</span></span><Badge s={j.status}/><span style={{width:88,textAlign:"right",fontWeight:600}}>{$$(jobCharge(s,j))}</span><button className="rc-bs" style={{fontSize:12,padding:"3px 8px"}} onClick={()=>d({type:"MODAL",v:"job-detail",d:j})}>Open</button></div>))}
          {sj.length>0&&<div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0 2px",fontSize:14,fontWeight:700,flexWrap:"wrap"}}><span style={{color:"var(--tx2)",fontWeight:500}}>Whole deal: engine {$$(engAmt)} + services {$$(svcAmt)}</span><span>{$$(engAmt+svcAmt)}</span></div>}
          <button className="rc-bs" style={{marginTop:8}} onClick={()=>d({type:"MODAL",v:"add-job",d:{prefill:{kind:"service",engineId:i.id,...(inv&&inv.custId?{custId:String(inv.custId)}:{})}}})}>+ Add a service</button>
        </div></>);})()}
      </>)}
      {ptab==="overview"&&i.notes&&<div className="rc-fg" style={{marginTop:8}}><div className="rc-fl">Notes</div><div style={{fontSize:14,color:"var(--tx2)"}}>{i.notes}</div></div>}
      <div className="rc-fa">{C}{engStatus(i)==="available"&&<button className="rc-ba" onClick={()=>d({type:"MODAL",v:"sell-engine",d:{engineId:i.id}})}>Sell Engine →</button>}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"export-engine",d:i})}>🌐 Export</button><button className="rc-bs" onClick={()=>printEngine(s,i)}>🖨 Print</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"qr-tags",d:{ids:[i.id]}})}>🏷 QR tag</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-part",d:i})}>✎ Edit</button></div></div>);}
  if(s.modal==="add-part"){const eng=isEngine({cat:f.cat});return W(<div><div className="rc-mt">Add {eng?"Engine":"Part"}</div>{PH()}{F("name","Name")}{eng&&!f.skuOwn?(<div className="rc-fg"><div className="rc-fl">SKU</div><div className="rc-sku-auto" aria-live="polite"><b>{nextEngineSku(s.inventory,f)}</b><span>Made for you from the make, family and year, and it updates as you type them. <button type="button" className="rc-lnk" onClick={()=>set("skuOwn",true)}>Type my own</button></span></div></div>):F("sku","SKU")}{F("cat","Category")}{eng?(<><div className="rc-fl" style={{marginTop:8}}>Engine identity</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{F("serial","ESN / Serial")}{F("cpl","CPL / AR#")}{F("arrangement","Arrangement")}{F("year","Year")}{F("ratedHp","Rated HP")}{F("oilCap","Oil Capacity")}</div>{F("sourceCore","Source Core")}{F("condition","Condition")}<div className="rc-fg"><label className="rc-fl">Lifecycle Status</label><select className="rc-fi" value={f.status||"available"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}>{ENG_STATUSES.map(st=>(<option key={st} value={st}>{engStatusLabel(st)}</option>))}</select></div><div className="rc-fl" style={{marginTop:8}}>Cost basis breakdown</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{F("costCore","Core Purchase","number")}{F("costFreight","Inbound Freight","number")}{F("costParts","Parts Kit (flat $ — itemized log is on the passport)","number")}{F("costLabor","Machine + Assembly","number")}</div>{F("price","Sell Price","number")}</>):(<>{[["cost","Cost","number"],["price","Price","number"],["qty","Qty","number"],["reorder","Reorder","number"],["condition","Condition"],["serial","Serial"]].map(([k,l,t])=>F(k,l,t))}</>)}{F("notes","Notes")}{WHY(!f.name?"Add the name.":(!eng||f.skuOwn)&&!f.sku?"Add the SKU.":"")}<div className="rc-fa">{X}<button className="rc-ba" disabled={uploading||!(f.name&&(f.sku||(eng&&!f.skuOwn)))} onClick={()=>{if(!(f.name&&(f.sku||(eng&&!f.skuOwn))))return;const{skuOwn,...f1}=f;const fx=eng&&!skuOwn?{...f1,sku:""}:f1;const d2=eng?{...fx,cat:fx.cat||"Complete Engine",status:f.status||"available",qty:1,reorder:0,price:+f.price||0,cost:+f.cost||0,costCore:+f.costCore||0,costFreight:+f.costFreight||0,costParts:+f.costParts||0,costLabor:+f.costLabor||0}:{...fx,qty:+f.qty||0,reorder:+f.reorder||2,price:+f.price||0,cost:+f.cost||0};d({type:"ADD",list:"inventory",d:d2});}}>Save</button></div></div>);}
  if(s.modal==="add-appt")return W(<div><div className="rc-mt">Book Appointment</div>{CS()}{[["date","Date"],["time","Time","time"],["duration","Duration (min)","number"]].map(([k,l,t])=>F(k,l,t))}{TS()}{F("service","Service")}{WHY(!f.custId?"Pick a customer.":!(f.service||"").trim()?"Add the service.":"")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!f.custId?"Pick a customer.":!(f.service||"").trim()?"Add the service.":"")} onClick={()=>f.custId&&f.service&&d({type:"ADD",list:"schedule",d:{...f,custId:+f.custId,duration:+f.duration||120,status:"pending"}})}>Save</button></div></div>);
  if(s.modal==="add-emp")return FM("Add Employee",[["name","Name"],["nick","Short Name"],["role","Role"],["phone","Phone"],["rate","Rate ($/hr)","number"],["hrs","Hours/Week","number"],["specialties","Specialties (comma sep)"],["certs","Certs (comma sep)"],["hireDate","Hire Date"]].filter(([k])=>owner||k!=="rate"),()=>f.name&&d({type:"ADD",list:"employees",d:{...f,rate:+f.rate||0,hrs:+f.hrs||0,status:"active",specialties:(f.specialties||"").split(",").map(x=>x.trim()).filter(Boolean),certs:(f.certs||"").split(",").map(x=>x.trim()).filter(Boolean)}}),!(""+(f.name||"")).trim()&&"Add the person's name.");
  if(s.modal==="add-expense")return FM("Add Expense",[["cat","Category"],["amount","Amount ($)","number"],["freq","How often",Mny.EXP_FREQS],["notes","Notes"]],()=>f.cat&&d({type:"ADD",list:"expenses",d:{...f,freq:Mny.freqKey(f.freq),amount:+f.amount||0}}),!(""+(f.cat||"")).trim()&&"Add a category.");
  if(s.modal==="add-lead")return FM("Add Lead",[["name","Name"],["phone","Phone"],["interest","Interest"],["source","Source"],["province","Province"],["notes","Notes"]],()=>f.name&&d({type:"ADD",list:"leads",d:{...f,status:"new",date:today()}}),!(""+(f.name||"")).trim()&&"Add a name.");
  if(s.modal==="add-social")return FM("Add Social",[["platform","Platform"],["handle","Handle"],["followers","Followers","number"],["posts","Posts","number"],["engagement","Engagement (%)","number"]],()=>f.platform&&d({type:"ADD",list:"social",d:{...f,followers:+f.followers||0,posts:+f.posts||0,engagement:+f.engagement||0}}),!(""+(f.platform||"")).trim()&&"Add the platform.");
  if(s.modal==="add-campaign")return FM("Add Campaign",[["name","Name"],["platform","Platform"],["type","Type"],["status","Status"],["reach","Reach","number"],["leads","Leads","number"],["spent","Spent ($)","number"],["budget","Budget ($)","number"],["notes","Notes"]],()=>f.name&&d({type:"ADD",list:"campaigns",d:{...f,reach:+f.reach||0,leads:+f.leads||0,spent:+f.spent||0,budget:+f.budget||0,status:f.status||"draft"}}),!(""+(f.name||"")).trim()&&"Add the campaign's name.");
  if(s.modal==="add-comm")return W(<div><div className="rc-mt">Log Communication</div>{CS()}<div className="rc-fg"><label className="rc-fl">Type</label><select className="rc-fi" value={f.type||"call"} onChange={e=>set("type",e.target.value)} style={{appearance:"none"}}><option value="call">Call</option><option value="email">Email</option><option value="text">Text</option><option value="note">Note</option></select></div>{[["date","Date"],["summary","Summary"],["followUp","Follow-Up Date"]].map(([k,l])=>F(k,l))}{WHY(!(f.summary||"").trim()&&"Add a summary.")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!(f.summary||"").trim()&&"Add a summary.")} onClick={()=>f.summary&&d({type:"ADD",list:"commsLog",d:{...f,custId:+f.custId||0,date:f.date||isoToday()}})}>Save</button></div></div>);
  if(s.modal==="add-core")return W(<div><div className="rc-mt">Add Core Return</div>{CS()}{ES(eng=>set("engineName",eng.name))}{[["engineName","Engine Name"],["deposit","Core Deposit ($)","number"],["dueDate","Due Date"],["notes","Notes"]].map(([k,l,t])=>F(k,l,t))}{WHY(!(f.engineName||"").trim()&&"Pick the engine, or type its name.")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!(f.engineName||"").trim()&&"Pick the engine, or type its name.")} onClick={()=>f.engineName&&d({type:"ADD",list:"cores",d:{...f,custId:+f.custId||0,engineId:+f.engineId||0,deposit:+f.deposit||0,status:"pending"}})}>Save</button></div></div>);
  if(s.modal==="add-ship")return W(<div><div className="rc-mt">Add Shipment</div>{CS()}{ES()}{[["carrier","Carrier"],["tracking","Tracking #"],["freightCost","Freight Cost ($)","number"],["shipDate","Ship Date"],["estDelivery","Est. Delivery"],["origin","Origin"],["destination","Destination"],["notes","Notes"]].map(([k,l,t])=>F(k,l,t))}{WHY(!(f.carrier||"").trim()&&"Add the carrier.")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!(f.carrier||"").trim()&&"Add the carrier.")} onClick={()=>f.carrier&&d({type:"ADD",list:"shipments",d:{...f,custId:+f.custId||0,engineId:+f.engineId||0,freightCost:+f.freightCost||0,deliveryConfirmed:false}})}>Save</button></div></div>);
  if(s.modal==="add-po")return W(<div><div className="rc-mt">New Purchase Order</div>{[["vendor","Vendor"],["orderDate","Order Date"],["eta","ETA"],["notes","Notes"]].map(([k,l])=>F(k,l))}<div className="rc-fl">Items</div>{LI()}<div className="rc-tot">Total {$$(Mny.linesSub(lines))}</div>{WHY(!(f.vendor||"").trim()?"Add the vendor.":lineWhy())}<div className="rc-fa">{X}<button className="rc-ba" disabled={!(f.vendor||"").trim()||!!lineWhy()} onClick={()=>(f.vendor||"").trim()&&!lineWhy()&&d({type:"ADD",list:"purchaseOrders",d:{vendor:f.vendor,orderDate:f.orderDate||isoToday(),eta:f.eta,notes:f.notes,items:Mny.usedLines(lines),status:"ordered"}})}>Save</button></div></div>);
  if(s.modal==="add-warranty")return W(<div><div className="rc-mt">Add Warranty</div>{CS()}{ES(eng=>set("engineName",eng.name))}{[["engineName","Engine Name"],["warrantyPeriod","Warranty Period (e.g. 2yr/unlimited km)"],["startDate","Start Date"],["expiryDate","Expiry Date"],["claimNotes","Notes"]].map(([k,l])=>F(k,l))}{WHY(!(f.engineName||"").trim()&&"Pick the engine, or type its name.")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!(f.engineName||"").trim()&&"Pick the engine, or type its name.")} onClick={()=>f.engineName&&d({type:"ADD",list:"warranties",d:{...f,custId:+f.custId||0,engineId:+f.engineId||0,status:"active"}})}>Save</button></div></div>);

  // Quote & Invoice with line items
  if(s.modal==="add-quote"){const rate=taxPick();const doc={items:lines,taxRate:rate};const why=custWhy()||(!(f.description||"").trim()?"Give the quote a description.":lineWhy());
    return W(<div><div className="rc-mt">New Quote</div>{CS(true)}{F("quoteNum","Quote #")}{F("description","Description")}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{F("date","Date")}{F("validUntil","Valid Until")}</div>{TAXSEL(rate)}<div className="rc-fl">Items</div>{LI()}{F("notes","Notes")}{TOT(doc)}{WHY(why)}
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!!why} onClick={()=>{if(why)return;d({type:"ADD",list:"quotes",d:{quoteNum:f.quoteNum||"QT-"+Date.now().toString().slice(-6),custId:custFor(),description:f.description,date:f.date||isoToday(),validUntil:f.validUntil||"30 days",taxRate:rate,items:Mny.usedLines(lines),notes:f.notes||"",status:"draft"}});}}>Save</button></div></div>);}
  if(s.modal==="add-svc"||s.modal==="edit-svc"){const ed=s.modal==="edit-svc";const pricing=f.pricing||"flat";const cats=svcCats(s.services||[]);const sr=shopRate(s);
    return W(<div><div className="rc-mt">{ed?"Edit Service":"Add Service"}</div>
      {F("name","Service name")}
      <div className="rc-fg"><label className="rc-fl">Category</label><input className="rc-fi" id="svc-cat" list="svc-cats" value={f.cat||""} onChange={e=>set("cat",e.target.value)} placeholder="Pick or type a category"/><datalist id="svc-cats">{cats.map(c=>(<option key={c} value={c}/>))}</datalist></div>
      <div className="rc-fg"><label className="rc-fl">How it's charged</label><div className="rc-seg two" role="group" aria-label="How it's charged">{[["flat","Flat price"],["hourly","By the hour"]].map(([k,l])=>(<button key={k} type="button" className={pricing===k?"on":""} aria-pressed={pricing===k} onClick={()=>set("pricing",k)}>{l}</button>))}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{pricing==="flat"?F("price","Price ($)","number"):<div className="rc-fg"><label className="rc-fl">Rate</label><div style={{fontSize:14,padding:"9px 0",color:"var(--tx2)"}}>Shop rate · {sr?$$(sr)+"/hr":"not set yet"}</div></div>}{F("hours","Typical hours (optional)","number")}</div>
      {TA("desc","What's included",2)}
      <div className="rc-fg"><label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,cursor:"pointer"}}><input type="checkbox" checked={truthy(f.withEngine)} onChange={e=>set("withEngine",e.target.checked)}/> Offer it when selling an engine</label>
        {truthy(f.withEngine)&&<label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,cursor:"pointer",marginTop:6,paddingLeft:24}}><input type="checkbox" checked={truthy(f.preTick)} onChange={e=>set("preTick",e.target.checked)}/> Tick it by default</label>}
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,cursor:"pointer",marginTop:6}}><input type="checkbox" checked={!(f.active===false||f.active==="false")} onChange={e=>set("active",e.target.checked)}/> Show it in the pickers</label></div>
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{const name=(f.name||"").trim();if(!name)return;const row={name,cat:(f.cat||"").trim()||"Other",pricing,price:pricing==="flat"?(+f.price||""):"",hours:+f.hours||"",desc:(f.desc||"").trim(),withEngine:truthy(f.withEngine),preTick:truthy(f.withEngine)&&truthy(f.preTick),active:!(f.active===false||f.active==="false")};if(ed){d({type:"UPDATE",list:"services",id:s.md.id,d:row});d({type:"CLOSE"});}else d({type:"ADD",list:"services",d:row,label:"Service added"});}}>{ed?"Save Changes":"Add Service"}</button></div>
    </div>);}
  if(s.modal==="sell-engine"){const eng=engById(s,s.md&&s.md.engineId)||{};const all=svcActive(s);
    // Until the form is touched, the ticks, charges and price come straight from the price list and the engine.
    const pk=f.seSvc||Object.fromEntries(all.filter(x=>truthy(x.withEngine)).map(x=>[x.id,{on:truthy(x.preTick),charge:String(svcDefault(s,x)||"")}]));const priceIn=f.sePrice!=null?f.sePrice:String(eng.price||"");
    const setPk=(id,patch)=>set("seSvc",{...pk,[id]:{...(pk[id]||{}),...patch}});
    const shown=all.filter(x=>truthy(x.withEngine)||pk[x.id]);const others=all.filter(x=>!shown.includes(x));
    const chosen=shown.filter(x=>pk[x.id]&&pk[x.id].on);
    const price=+priceIn||0;const svcSum=chosen.reduce((a,x)=>a+(+pk[x.id].charge||0),0);const sub=price+svcSum;
    const newName=(f.seNewCust||"").trim();const canSell=!!(eng.id&&(f.custId||newName));const rate=taxPick();
    const doc={items:[{q:1,r:price},...chosen.map(x=>({q:1,r:+pk[x.id].charge||0}))],taxRate:rate};
    const create=()=>{if(!canSell)return;const nid=Date.now();const invNum=(f.invNum||"").trim()||"INV-"+String(nid).slice(-6);
      let cid=+f.custId||0;if(!cid){cid=nid+5;d({type:"ADD",list:"customers",d:{id:cid,name:newName,type:"Individual",phone:"",email:"",province:"",vehicles:(f.seVeh||"").trim()?[(f.seVeh||"").trim()]:[],notes:"",tags:[],spent:0,visits:0,last:today()},label:"Customer added"});}
      const jobs=chosen.map((x,k)=>({id:nid+11+k,kind:"service",svcId:x.id,service:x.name,pricing:"flat",charge:+pk[x.id].charge||0,rate:0,custId:cid,engineId:eng.id,vehicle:(f.seVeh||"").trim(),tech:"Unassigned",due:"",priority:"medium",status:"queued",invoiceId:nid,notes:"Sold with "+(eng.name||eng.sku||"the engine")+" on "+invNum+"."}));
      const items=[{d:(eng.name||eng.sku||"Engine")+((eng.serial||eng.esn)?" (ESN "+(eng.serial||eng.esn)+")":""),q:1,r:price,kind:"engine"},...jobs.map(jb=>({d:jb.service,q:1,r:jb.charge,svcId:jb.svcId,jobId:jb.id}))];
      d({type:"ADD",list:"invoices",d:{id:nid,invNum,custId:cid,engineId:eng.id,date:isoToday(),due:"Net 30",dueDate:Mny.dueDateOf({date:isoToday(),due:"Net 30"}),taxRate:rate,items,status:"pending"},label:"Invoice "+invNum+" created"});
      jobs.forEach(jb=>d({type:"ADD",list:"jobs",d:jb,label:jb.service+" — work order opened"}));
      if(price!==(+eng.price||0))d({type:"UPDATE",list:"inventory",id:eng.id,d:{price}});
      d({type:"UPDATE",list:"inventory",id:eng.id,d:{status:"sold"}});d({type:"CLOSE"});};
    const row=x=>{const p=pk[x.id]||{};return(<div key={x.id} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--ln2)",flexWrap:"wrap"}}>
      <label style={{display:"flex",gap:9,alignItems:"flex-start",flex:1,minWidth:200,cursor:"pointer"}}><input type="checkbox" checked={!!p.on} onChange={e=>setPk(x.id,{on:e.target.checked,charge:p.charge!=null?p.charge:String(svcDefault(s,x)||"")})} style={{marginTop:4}}/><span><span style={{fontSize:14,fontWeight:500}}>{x.name}</span>{x.desc&&<span style={{display:"block",fontSize:12.5,color:"var(--mt)",lineHeight:1.4}}>{x.desc}</span>}</span></label>
      <input className="rc-fi" type="number" placeholder="$ charge" aria-label={"Charge for "+x.name} value={p.charge||""} onChange={e=>setPk(x.id,{charge:e.target.value,on:true})} style={{width:124}}/>
    </div>);};
    return W(<div><div className="rc-mt" style={{marginBottom:3}}>Sell Engine</div>
      <div style={{fontSize:13,color:"var(--mt)",marginBottom:14}}>{eng.name||eng.sku}{eng.sku&&eng.name?" · "+eng.sku:""}{(eng.serial||eng.esn)?" · ESN "+(eng.serial||eng.esn):""}</div>
      {CS()}
      {!f.custId&&<div className="rc-fg"><label className="rc-fl">…or a new customer</label><input className="rc-fi" placeholder="Name — add phone and email later" value={f.seNewCust||""} onChange={e=>set("seNewCust",e.target.value)}/></div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div className="rc-fg"><label className="rc-fl">Engine price</label><input className="rc-fi" type="number" placeholder="$" value={priceIn} onChange={e=>set("sePrice",e.target.value)}/></div>{F("invNum","Invoice # (optional)")}</div>
      <div className="rc-fl" style={{marginTop:2}}>What's going with this engine?</div>
      <div className="rc-card" style={{padding:"2px 12px",marginBottom:10}}>{shown.length?shown.map(row):<div style={{fontSize:13,color:"var(--mt)",padding:"10px 0"}}>No services are set to show here yet. Mark some in Sales → Services.</div>}
        {others.length>0&&<div style={{padding:"9px 0"}}><select className="rc-fi" value="" onChange={e=>{const x=svcById(s,e.target.value);if(x)setPk(x.id,{on:true,charge:String(svcDefault(s,x)||"")});}} style={{appearance:"none"}}><option value="">+ Add another service…</option>{svcCats(others).map(c=>(<optgroup key={c} label={c}>{others.filter(x=>(x.cat||"Other")===c).map(x=>(<option key={x.id} value={x.id}>{x.name}</option>))}</optgroup>))}</select></div>}
      </div>
      {chosen.length>0&&F("seVeh","Customer's truck / unit, for the work order")}
      {TAXSEL(rate)}
      {chosen.some(x=>!(+pk[x.id].charge))&&<p style={{fontSize:12.5,color:"var(--w)",margin:"0 0 8px"}}>A ticked service has no charge. Set your standard prices in Sales → Services and they'll fill in here.</p>}
      <div className="rc-card" style={{padding:12,marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,padding:"2px 0"}}><span style={{color:"var(--tx2)"}}>Engine</span><span>{$$(price)}</span></div>
        {chosen.map(x=>(<div key={x.id} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:14,padding:"2px 0"}}><span style={{color:"var(--tx2)"}}>{x.name}</span><span>{$$(+pk[x.id].charge||0)}</span></div>))}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--mt)",marginTop:6}}><span>{Mny.taxName(doc)}</span><span>{$$(Mny.docTax(doc))}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:17,fontWeight:700,marginTop:4}}><span>Total</span><span style={{color:"var(--act)"}}>{$$(Mny.docTotal(doc))}</span></div>
      </div>
      <p style={{fontSize:12.5,color:"var(--mt)",margin:"8px 0 0",lineHeight:1.5}}>Creates the invoice, opens a work order for each service so the crew can log time against it, and marks the engine sold.</p>
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!canSell} onClick={create}>{canSell?"Sell · create invoice":"Pick a customer first"}</button></div>
    </div>);}
  if(s.modal==="add-ecm"){const eng=f.engineId?engById(s,f.engineId):null;const newName=(f.newCust||"").trim();const ok=!!(f.custId||newName);
    const pickEng=v=>{const e=engById(s,v);sf(pp=>({...pp,engineId:v,...(e?{family:pp.family||ecmFamOf(e),esn:pp.esn||e.serial||e.esn||""}:{})}));};
    const create=()=>{if(!ok)return;const nid=Date.now();let cid=+f.custId||0;
      if(!cid){cid=nid+5;d({type:"ADD",list:"customers",d:{id:cid,name:newName,type:"Individual",phone:"",email:"",province:"",vehicles:(f.unit||"").trim()?["Unit "+(f.unit||"").trim()]:[],notes:"",tags:[],spent:0,visits:0,last:today()},label:"Customer added"});}
      d({type:"ADD",list:"ecmJobs",d:{id:nid,date:f.date||isoToday(),status:"intake",...ecmBlank(),custId:cid,unit:(f.unit||"").trim(),vin:(f.vin||"").trim(),family:f.family||"",esn:(f.esn||"").trim(),engineId:eng?eng.id:null,cpl:eng?(eng.cpl||""):"",arrangement:eng?(eng.arrangement||""):"",hp:eng?(eng.ratedHp||""):""},label:"ECM job opened"});
      d({type:"MODAL",v:"ecm-job",d:{id:nid}});};
    return W(<div><div className="rc-mt">New ECM Job</div>
      {CS()}
      {!f.custId&&<div className="rc-fg"><label className="rc-fl">…or a new customer</label><input className="rc-fi" placeholder="Name — add phone and email later" value={f.newCust||""} onChange={e=>set("newCust",e.target.value)}/></div>}
      <div className="rc-ecm-g2">{F("unit","Unit #")}{F("vin","VIN")}</div>
      <div className="rc-fg"><label className="rc-fl">Engine family</label>{ecmFamSelect(f.family,v=>set("family",v))}</div>
      {F("esn","Engine serial (ESN)")}
      <div className="rc-fg"><label className="rc-fl">Engine from our inventory? (optional)</label><select className="rc-fi" value={f.engineId||""} onChange={e=>pickEng(e.target.value)} style={{appearance:"none"}}><option value="">No, the customer's own engine</option>{(s.inventory||[]).filter(isEngine).map(e=>(<option key={e.id} value={e.id}>{e.name}{(e.serial||e.esn)?" · ESN "+(e.serial||e.esn):""}{engStatus(e)==="sold"?" · sold":""}</option>))}</select></div>
      {F("date","Date in")}
      <p style={{fontSize:12.5,color:"var(--mt)",margin:"0 0 4px",lineHeight:1.5}}>The rest of the intake, the baseline and the work go on the job sheet next.</p>
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!ok} onClick={create}>{ok?"Open ECM Job":"Pick a customer first"}</button></div>
    </div>);}
  if(s.modal==="ecm-prices"){const cur=(s.settings||[])[0];const pr=ecmPrices(s);const val=k=>f["p_"+k]!=null?f["p_"+k]:(pr[k]!=null&&pr[k]!==""?String(pr[k]):"");
    const save=()=>{const np={};ECM_TYPES.forEach(([k])=>{const v=String(val(k)).trim();if(v!=="")np[k]=+v||0;});if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:{ecmPrices:np}});else d({type:"ADD",list:"settings",keep:true,d:{ecmPrices:np}});d({type:"TOAST",d:{msg:"ECM price list saved",t:Date.now()}});d({type:"BACK"});};
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>ECM Price List</div><div style={{fontSize:13,color:"var(--mt)",marginBottom:12,lineHeight:1.5}}>Your posted flat price for each kind of ECM job. A job adds up the types ticked on it, and the tech can override the total with a reason.</div>
      {ECM_TYPES.map(([k,l])=>(<div key={k} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--ln2)"}}><span style={{flex:1,fontSize:14}}>{l}</span><span style={{color:"var(--mt)"}}>$</span><input className="rc-fi" type="number" aria-label={"Price for "+l} value={val(k)} onChange={e=>set("p_"+k,e.target.value)} style={{width:130}}/></div>))}
      <div className="rc-fa">{X}<button className="rc-ba" onClick={save}>Save prices</button></div></div>);}
  if(s.modal==="ecm-job"){const j=(s.ecmJobs||[]).find(x=>x.id===+(s.md&&s.md.id));
    if(!j)return W(<div><div className="rc-mt">ECM job not found</div><div style={{fontSize:14,color:"var(--mt)"}}>It may have been deleted. Undo from the toast if that was a mistake.</div><div className="rc-fa">{C}</div></div>);
    const up=patch=>d({type:"UPDATE",list:"ecmJobs",id:j.id,d:patch});
    const upN=(k,sub,v)=>up({[k]:{...(j[k]||{}),[sub]:v}});
    const eng=j.engineId?engById(s,j.engineId):null;const war=ecmWarranty(s,eng);const inv=ecmInv(s,j);const files=ecmFilesFor(s,j.id);
    const hold=j.status==="on-hold";const emHold=hold&&j.holdReason==="emissions";const miss=ecmMissing(j);const T=etab;const warrantyJob=j.billTo==="warranty";
    const canBill=!warrantyJob&&!inv&&!!j.custId&&((j.types||[]).length>0||ecmPartsSum(j)>0)&&!(ecmOver(j)&&!String(j.priceReason||"").trim());
    const bill=()=>d({type:"MODAL",v:"add-inv",d:{custId:j.custId,prefillItems:ecmBillLines(s,j)}});
    // Field helpers bound straight to the job: every change saves, and the reducer's emissions guard sees it.
    const EI=(k,l,t,ph)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><input className="rc-fi" type={t||"text"} placeholder={ph||""} value={j[k]??""} onChange={e=>up({[k]:e.target.value})}/></div>);
    const NI=(k,sub,l,t)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><input className="rc-fi" type={t||"text"} value={(j[k]||{})[sub]??""} onChange={e=>upN(k,sub,e.target.value)}/></div>);
    const SEL=(k,l,opts)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><select className="rc-fi" value={j[k]||""} onChange={e=>up({[k]:e.target.value})} style={{appearance:"none"}}><option value="">—</option>{opts.map(o=>(<option key={o} value={o}>{o}</option>))}</select></div>);
    const TX=(k,l,rows)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><textarea className="rc-fi" rows={rows||2} value={j[k]||""} onChange={e=>up({[k]:e.target.value})} style={{resize:"vertical"}}/></div>);
    const SEC=(t,sub)=>(<div className="rc-ecm-sec">{t}{sub&&<span>{sub}</span>}</div>);
    const chips=(k,opts,lab)=>{const v=j[k]||[];return(<div role="group" aria-label={lab} style={{display:"flex",gap:6,flexWrap:"wrap"}}>{opts.map(([o,l])=>(<button key={o} type="button" className={"rc-fb"+(v.includes(o)?" on":"")} aria-pressed={v.includes(o)} onClick={()=>up({[k]:v.includes(o)?v.filter(x=>x!==o):[...v,o]})} style={{textTransform:"none",letterSpacing:0}}>{l}</button>))}</div>);};
    // Fault codes: code, description, count, last seen, active / inactive.
    const FT=k=>{const rows=j[k]||[];const setR=(x,patch)=>up({[k]:rows.map((r,y)=>y===x?{...r,...patch}:r)});return(<div style={{marginBottom:10}}>
      {rows.length>0&&<div className="rc-ecm-ft rc-ecm-ph"><span>Code</span><span>Description</span><span>Count</span><span>Last seen</span><span/><span/></div>}
      {rows.map((r,x)=>(<div key={r.id||x} className="rc-ecm-ft"><input className="rc-fi" aria-label="Fault code" placeholder="SPN / FMI" value={r.code||""} onChange={e=>setR(x,{code:e.target.value})}/><input className="rc-fi" aria-label="Fault description" placeholder="Description" value={r.desc||""} onChange={e=>setR(x,{desc:e.target.value})}/><input className="rc-fi" aria-label="Fault count" type="number" placeholder="#" value={r.count||""} onChange={e=>setR(x,{count:e.target.value})}/><input className="rc-fi" aria-label="Last occurrence" type="date" value={r.last||""} onChange={e=>setR(x,{last:e.target.value})}/><button type="button" className={"rc-fb"+(r.state==="inactive"?"":" on")} onClick={()=>setR(x,{state:r.state==="inactive"?"active":"inactive"})}>{r.state==="inactive"?"Inactive":"Active"}</button><button className="rc-bs rc-bsr" aria-label="Remove fault code" onClick={()=>up({[k]:rows.filter((_,y)=>y!==x)})}>×</button></div>))}
      <button className="rc-bs" onClick={()=>up({[k]:[...rows,{id:Date.now(),code:"",desc:"",count:"",last:"",state:"active"}]})}>+ Fault code</button></div>);};
    // EGR / DPF / SCR: present and functioning? Yes / No, plus notes.
    const EM=(k,when)=>(<div className="rc-card" style={{padding:"2px 12px",marginBottom:10}}>{EMIS.map(([e,l])=>{const v=ecmEm(j,k,e);const setE=patch=>up({[k]:{...(j[k]||{}),[e]:{...v,...patch}}});return(<div key={e} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--ln2)",flexWrap:"wrap"}}>
      <span style={{fontWeight:700,width:42}}>{l}</span><span style={{fontSize:13,color:"var(--tx2)",flex:"1 1 150px"}}>Present and functioning?</span>
      <div className="rc-seg two" role="group" aria-label={l+" "+when} style={{width:150}}>{[["yes","Yes"],["no","No"]].map(([o,ol])=>(<button key={o} type="button" aria-label={l+" "+when+": "+ol} aria-pressed={v.ok===o} className={v.ok===o?"on":""} onClick={()=>setE({ok:v.ok===o?"":o})} style={v.ok===o?{color:o==="no"?"var(--r)":"var(--g)"}:undefined}>{ol}</button>))}</div>
      <input className="rc-fi" aria-label={l+" "+when+" notes"} placeholder="Notes" value={v.notes||""} onChange={ev=>setE({notes:ev.target.value})} style={{flex:"1 1 180px",width:"auto"}}/></div>);})}</div>);
    const DY=k=>(<div className="rc-ecm-g">{[["hp","Peak HP"],["hpRpm","Peak HP @ rpm"],["tq","Peak torque (lb-ft)"],["tqRpm","Peak torque @ rpm"],["boost","Max boost (psi)"],["egt","Max EGT (°C)"]].map(([sub,l])=>(<div key={sub}>{NI(k,sub,l,"number")}</div>))}</div>);
    const linkEng=v=>{const e=engById(s,v);if(!e){up({engineId:null,billTo:"customer"});return;}up({engineId:e.id,family:j.family||ecmFamOf(e),esn:j.esn||e.serial||e.esn||"",cpl:j.cpl||e.cpl||"",arrangement:j.arrangement||e.arrangement||"",hp:j.hp||e.ratedHp||""});};
    const match=!j.engineId&&String(j.esn||"").trim()?(s.inventory||[]).filter(isEngine).find(e=>normM(e.serial||e.esn)&&normM(e.serial||e.esn)===normM(j.esn)):null;
    const pickFiles=async ev=>{const picked=[...(ev.target.files||[])];ev.target.value="";if(!picked.length)return;set("upBusy",true);
      for(const file of picked){const type=ecmFileType(file.name);if(!type){d({type:"TOAST",d:{msg:"Skipped "+file.name+": use CSV, TXT, XML, PDF, ZIP or an image",long:true,t:Date.now()}});continue;}if(file.size>ECM_MAX_BYTES){d({type:"TOAST",d:{msg:"Skipped "+file.name+": it's over 10 MB",long:true,t:Date.now()}});continue;}
        const cur=ecmFilesFor(sRef2.current,j.id);const names=new Set(cur.map(x=>String(x.name).toLowerCase()));const base=file.name.replace(/[^A-Za-z0-9._ ()-]/g,"_");let nm=base,k=2;while(names.has(nm.toLowerCase())){nm=base.replace(/(\.[^.]*)?$/,m=>" ("+k+")"+m);k++;}
        try{const r=await uploadEcmFile(j.id+"/"+Date.now().toString(36)+"-"+nm,file);d({type:"ADD",list:"ecmFiles",keep:true,d:{jobId:j.id,path:r.path,name:nm,size:r.size,type:r.type,at:isoToday()},label:"📎 "+nm+" uploaded"});}catch(err){d({type:"TOAST",d:{msg:"Upload failed: "+(err&&err.message?err.message:String(err)),long:true,t:Date.now()}});}}
      set("upBusy",false);};
    const openF=fl=>{openEcmFile(fl.path).catch(err=>d({type:"TOAST",d:{msg:"Couldn't open "+fl.name+": "+(err&&err.message?err.message:String(err)),long:true,t:Date.now()}}));};
    // Undoable: the row goes now; the stored file goes once the undo window has passed, if the row didn't come back.
    const delF=fl=>{d({type:"DELETE",list:"ecmFiles",id:fl.id});setTimeout(()=>{if(!(sRef2.current.ecmFiles||[]).some(x=>x.path===fl.path))removeEcmFiles([fl.path]);},12000);};
    const review=async()=>{if(f.aiBusy)return;set("aiBusy",true);try{const texts=[];for(const fl of files.filter(x=>ecmIsText(x.type)).slice(0,3)){try{texts.push("--- "+fl.name+" ---\n"+await readEcmText(fl.path,4000));}catch(e){}}
      const prompt=ECM_AI_RULES+"\n\nECM job data:\n"+ecmSummary(s,j)+(texts.length?"\n\nUploaded logs (truncated):\n"+texts.join("\n\n"):"")+"\n\nWrite a short plain-language review in three parts: What changed. Anything abnormal (for example high EGT, low boost, frequent regens, fault patterns). What to check next. Explain and flag only.";
      const out=await askClaude(prompt,{system:ECM_AI_RULES});if(/^(AI is not configured|AI error|Error generating content)/.test(out)){d({type:"TOAST",d:{msg:out,long:true,t:Date.now()}});return;}up({aiReview:out,aiAt:nowIso()});}finally{set("aiBusy",false);}};
    const order=ECM_ST.map(x=>x[0]);const ix=order.indexOf(j.status||"intake");const nxt=!hold&&ix>=0&&ix<3?order[ix+1]:null;const tabFor={baseline:"baseline","in-progress":"work",verify:"verify"};
    const go=st=>{const g=ecmGuard(j,{...j,status:st});up({status:st});if(g.j.status===st&&tabFor[st])setEtab(tabFor[st]);};
    const fuB=+((j.trip||{}).fuel),rgB=+((j.dpf||{}).regenEvery);
    return W(<div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><div className="rc-mt" style={{margin:0}}>ECM Job</div><Badge s={j.status||"intake"}/>{warrantyJob&&<span className="rc-fb on" style={{cursor:"default"}}>Warranty · our cost</span>}{inv&&<span style={{fontSize:13,color:"var(--g)",fontWeight:600}}>✓ Billed on {inv.invNum||inv.id}</span>}</div>
      <div style={{fontSize:14,color:"var(--tx2)",margin:"6px 0 10px"}}>{ecmJobLabel(s,j)}{j.esn?" · ESN "+j.esn:""}{j.date?" · opened "+j.date:""}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,fontSize:12.5}}>{[["emisIn","Intake"],["emisOut","Release"]].map(([k,l])=>(<span key={k} className="rc-ecm-em">{l} emissions check:{EMIS.map(([e,el])=>{const v=ecmEm(j,k,e).ok;return(<b key={e} style={{color:v==="yes"?"var(--g)":v==="no"?"var(--r)":"var(--mt)",marginLeft:7}}>{el} {v==="yes"?"✓":v==="no"?"✗":"?"}</b>);})}</span>))}</div>
      {emHold&&<div className="rc-ecm-ban bad">⛔ On hold: emissions issue. This job can't go any further until EGR, DPF and SCR are present and working. Record the repair in the emissions check and the hold lifts.</div>}
      {hold&&!emHold&&<div className="rc-ecm-ban warn"><span style={{flex:1}}>On hold.</span><button className="rc-bs" onClick={()=>up({status:j.holdFrom||"intake",holdReason:"",holdFrom:""})}>Release hold</button></div>}
      {war&&war.on&&<div className="rc-ecm-ban info">🛡 This engine is under a Rollin Coal warranty until {war.w.expiryDate}. Record every change, and have the customer sign off on the warranty terms.</div>}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>{ECM_ST.map(([k,l],x)=>(<span key={k} style={{display:"inline-flex",alignItems:"center",gap:4}}>{x>0&&<span style={{color:"var(--ft)"}}>›</span>}<button className={"rc-fb"+(j.status===k?" on":"")} aria-pressed={j.status===k} onClick={()=>go(k)}>{l}</button></span>))}{!hold&&j.status!=="complete"&&<button className="rc-bs" style={{marginLeft:"auto"}} onClick={()=>up({status:"on-hold",holdReason:"manual",holdFrom:j.status||"intake"})}>Put on hold</button>}</div>
      <div role="tablist" aria-label="Job sheet sections" style={{display:"flex",gap:6,flexWrap:"wrap",borderBottom:"1px solid var(--ln)",paddingBottom:10,marginBottom:4}}>{[["intake","Intake"],["baseline","Baseline"],["work","Work"],["verify","Verify"],["follow","Follow-up"]].map(([k,l])=>(<button key={k} role="tab" aria-selected={T===k} className={"rc-fb"+(T===k?" on":"")} onClick={()=>setEtab(k)}>{l}</button>))}</div>
      {T==="intake"&&(<>
        {SEC("Customer and truck")}
        <div className="rc-fg"><label className="rc-fl">Customer</label><select className="rc-fi" value={j.custId||""} onChange={e=>up({custId:+e.target.value||0})} style={{appearance:"none"}}><option value="">Select…</option>{(s.customers||[]).map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        <div className="rc-ecm-g">{EI("unit","Unit #")}{EI("vin","VIN")}{EI("year","Year","number")}{EI("make","Make")}{EI("model","Model")}</div>
        {SEC("Engine and ECM")}
        <div className="rc-ecm-g"><div className="rc-fg"><label className="rc-fl">Engine family</label>{ecmFamSelect(j.family,v=>up({family:v}))}</div>{EI("esn","Engine serial (ESN)")}{EI("cpl","CPL #","text","Cummins")}{EI("arrangement","Arrangement #")}{EI("ecmPn","ECM part #")}{EI("ecmSn","ECM serial #")}{EI("calCur","Software / calibration ID")}{EI("hp","Advertised HP","number")}{EI("tq","Advertised torque (lb-ft)","number")}</div>
        <div className="rc-fg"><label className="rc-fl">Engine from our inventory</label><select className="rc-fi" value={j.engineId||""} onChange={e=>linkEng(e.target.value)} style={{appearance:"none"}}><option value="">Not one of ours</option>{(s.inventory||[]).filter(isEngine).map(e=>(<option key={e.id} value={e.id}>{e.name}{(e.serial||e.esn)?" · ESN "+(e.serial||e.esn):""}{engStatus(e)==="sold"?" · sold":""}</option>))}</select></div>
        {match&&<div className="rc-ecm-ban info"><span style={{flex:1}}>This ESN matches {match.name}{match.sku?" ("+match.sku+")":""} from our inventory.</span><button className="rc-bs" onClick={()=>linkEng(match.id)}>Link it</button></div>}
        {eng&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",fontSize:13.5,color:"var(--tx2)",margin:"-4px 0 10px"}}><span>{war?(war.on?"Rollin Coal warranty active until "+war.w.expiryDate+".":"Rollin Coal warranty ended "+(war.w.expiryDate||"")+"."):"No Rollin Coal warranty on file for this engine."}</span><button className="rc-bs" style={{padding:"3px 9px",fontSize:12.5}} onClick={()=>d({type:"MODAL",v:"part-detail",d:{...eng,ptab:"diagnosis"}})}>Open its passport</button></div>}
        {SEC("Drivetrain and how it's used")}
        <div className="rc-ecm-g">{SEL("trans","Transmission",ECM_TRANS)}{EI("transModel","Transmission model")}{EI("axle","Rear axle ratio","text","e.g. 3.36")}{EI("tire","Tire size","text","e.g. 295/75R22.5")}{EI("gvw","Typical GVW / load (kg)")}{SEL("application","Application",ECM_APPS)}{SEL("terrain","Typical route terrain",ECM_TERRAIN)}{EI("odo","Odometer (km)","number")}{EI("engHours","Engine hours","number")}</div>
        {SEC("What the customer wants")}
        {chips("goals",ECM_GOALS,"Customer goals")}
        <div style={{marginTop:10}}>{TX("goalNotes","Notes",2)}</div>
      </>)}
      {T==="baseline"&&(<>
        {SEC("Emissions check at intake","Required on every job")}
        {EM("emisIn","at intake")}
        {SEC("Fault codes","Active and inactive, before any change")}
        {FT("bFaults")}
        {SEC("Injector trim codes","As read from the ECM")}
        <div className="rc-ecm-g">{[0,1,2,3,4,5].map(x=>(<div key={x} className="rc-fg"><label className="rc-fl">Cylinder {x+1}</label><input className="rc-fi" aria-label={"Injector trim code cylinder "+(x+1)} value={(j.trims||[])[x]||""} onChange={e=>{const tt=[...(j.trims||[])];while(tt.length<6)tt.push("");tt[x]=e.target.value;up({trims:tt});}}/></div>))}</div>
        {SEC("ECM trip data")}
        <div className="rc-ecm-g">{NI("trip","fuel","Fuel economy (L/100 km)","number")}{NI("trip","idle","Idle %","number")}{NI("trip","avgSpd","Average speed (km/h)","number")}{NI("trip","topGear","Time in top gear %","number")}{NI("trip","fuelUsed","Total fuel used (L)","number")}{NI("trip","def","DEF used (L)","number")}</div>
        {SEC("DPF")}
        <div className="rc-ecm-g">{NI("dpf","regens","Regen count","number")}{NI("dpf","regenEvery","Km between regens","number")}{NI("dpf","lastRegen","Last regen","date")}{NI("dpf","soot","Soot load %","number")}</div>
        {SEC("Dyno baseline","Optional")}
        {DY("dynoB")}
        {SEC("Data logs and reports","INSITE, DiagnosticLink, DAVIE, Cat ET, Premium Tech Tool exports, dyno sheets, photos")}
        <div className="rc-card" style={{padding:12,marginBottom:12}}>
          {files.length===0?<div style={{fontSize:13,color:"var(--mt)",marginBottom:4}}>No files yet.</div>:files.map(fl=>(<div key={fl.id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--ln2)",fontSize:13.5,flexWrap:"wrap"}}><span style={{flex:1,minWidth:160,wordBreak:"break-all"}}>{fl.name}<span style={{display:"block",fontSize:12,color:"var(--mt)"}}>{fmtBytes(fl.size)}{fl.at?" · "+fl.at:""}</span></span><button className="rc-bs" onClick={()=>openF(fl)}>Open</button><button className="rc-bs rc-bsr" aria-label={"Delete "+fl.name} onClick={()=>delF(fl)}>×</button></div>))}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:8}}><label className="rc-bs" style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>{f.upBusy?"Uploading…":"📎 Upload files"}<input type="file" accept={ECM_ACCEPT} multiple disabled={!!f.upBusy} onChange={pickFiles} aria-label="Upload ECM files" style={{display:"none"}}/></label><span style={{fontSize:12.5,color:"var(--mt)"}}>CSV, TXT, XML, PDF, ZIP or images · 10 MB each · this job {fmtBytes(files.reduce((a,x)=>a+(+x.size||0),0))} · shop total {fmtBytes((s.ecmFiles||[]).reduce((a,x)=>a+(+x.size||0),0))} of {fmtBytes(ECM_FREE_BYTES)}</span></div>
        </div>
      </>)}
      {T==="work"&&(<>
        {SEC("Job type")}
        {chips("types",ECM_TYPES,"Job type")}
        <div style={{fontSize:12.5,color:"var(--mt)",margin:"6px 0 2px"}}>Programming, calibration updates, ECM setup, trim codes and emissions-intact tunes only.</div>
        {SEC("Parameters changed")}
        {(j.params||[]).length>0&&<div className="rc-ecm-pr rc-ecm-ph"><span>Parameter</span><span>Old value</span><span>New value</span><span>Reason</span><span/></div>}
        {(j.params||[]).map((p,x)=>{const sp=patch=>up({params:j.params.map((q2,y)=>y===x?{...q2,...patch}:q2)});return(<div key={p.id||x} className="rc-ecm-pr"><input className="rc-fi" aria-label="Parameter name" placeholder="Parameter" value={p.name||""} onChange={e=>sp({name:e.target.value})}/><input className="rc-fi" aria-label="Old value" placeholder="Old" value={p.old||""} onChange={e=>sp({old:e.target.value})}/><input className="rc-fi" aria-label="New value" placeholder="New" value={p.new||""} onChange={e=>sp({new:e.target.value})}/><input className="rc-fi" aria-label="Reason" placeholder="Reason" value={p.why||""} onChange={e=>sp({why:e.target.value})}/><button className="rc-bs rc-bsr" aria-label="Remove parameter" onClick={()=>up({params:j.params.filter((_,y)=>y!==x)})}>×</button></div>);})}
        <button className="rc-bs" onClick={()=>up({params:[...(j.params||[]),{id:Date.now(),name:"",old:"",new:"",why:""}]})}>+ Parameter</button>
        <div style={{fontSize:12.5,color:"var(--mt)",margin:"12px 0 6px"}}>Tap to add{ecmBrand(j.family)?" · "+ecmBrand(j.family)+" names":""}:</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{ecmParamPresets(j.family).map(nm=>{const has=(j.params||[]).some(p=>p.name===nm);return(<button key={nm} type="button" className={"rc-fb"+(has?" on":"")} disabled={has} onClick={()=>up({params:[...(j.params||[]),{id:Date.now(),name:nm,old:"",new:"",why:""}]})} style={{textTransform:"none",letterSpacing:0,fontSize:12.5}}>{has?"✓ ":"+ "}{nm}</button>);})}</div>
        {SEC("Calibration")}
        <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">Old calibration ID</label><input className="rc-fi" value={j.calOld!=null?j.calOld:(j.calCur||"")} onChange={e=>up({calOld:e.target.value})}/></div>{EI("calNew","New calibration ID")}</div>
        {(j.types||[]).includes("tune")&&(<>{SEC("Third-party tune","Emissions-intact only")}<div className="rc-ecm-g">{NI("tune","vendor","Vendor")}{NI("tune","file","Tune / file ID")}{NI("tune","ver","Version")}{NI("tune","job","Vendor job #")}</div></>)}
        {SEC("Labour and parts")}
        <div className="rc-ecm-g">{SEL("tool","Software / tool",ECM_TOOLS)}<div className="rc-fg"><label className="rc-fl">Tech</label><select className="rc-fi" value={j.tech||""} onChange={e=>{const v=e.target.value;const emp=(s.employees||[]).find(x=>(x.nick||x.name)===v);up({tech:v,...(emp&&!(+j.rate)?{rate:String(emp.rate||"")}:{})});}} style={{appearance:"none"}}><option value="">Unassigned</option>{(s.employees||[]).filter(e=>e.status==="active").map(e=>(<option key={e.id} value={e.nick||e.name}>{e.name}{e.rate?" · $"+e.rate+"/hr":""}</option>))}</select></div>{EI("hours","Hours","number")}{EI("rate","Tech pay rate ($/hr)","number")}</div>
        <div className="rc-card" style={{padding:"2px 12px",marginBottom:10}}>{(j.parts||[]).map((p,x)=>(<div key={x} style={{display:"flex",gap:6,padding:"7px 0",borderBottom:"1px solid var(--ln2)"}}><input className="rc-fi" aria-label="Part" placeholder="Part (new ECM, injectors…)" value={p.d||""} onChange={e=>up({parts:j.parts.map((q2,y)=>y===x?{...q2,d:e.target.value}:q2)})}/><input className="rc-fi" aria-label="Part price" type="number" placeholder="$" value={p.v??""} onChange={e=>up({parts:j.parts.map((q2,y)=>y===x?{...q2,v:e.target.value}:q2)})} style={{width:120}}/><button className="rc-bs rc-bsr" aria-label="Remove part" onClick={()=>up({parts:j.parts.filter((_,y)=>y!==x)})}>×</button></div>))}<button className="rc-bs" style={{margin:"8px 0"}} onClick={()=>up({parts:[...(j.parts||[]),{d:"",v:""}]})}>+ Part</button></div>
        {SEC("Who pays")}
        <div className="rc-seg two" role="group" aria-label="Who pays" style={{maxWidth:420}}>{[["customer","Customer"],["warranty","Warranty · our cost"]].map(([k,l])=>(<button key={k} type="button" disabled={k==="warranty"&&!eng} className={(j.billTo||"customer")===k?"on":""} aria-pressed={(j.billTo||"customer")===k} onClick={()=>up({billTo:k})}>{l}</button>))}</div>
        <div style={{fontSize:12.5,color:"var(--mt)",margin:"6px 0 10px",lineHeight:1.5}}>{warrantyJob?"No charge. The hours at tech pay and the parts go on "+(eng?eng.name:"the engine")+"'s cost basis, like a diagnosis.":"The customer pays the job price plus parts. The hours at tech pay are what the job costs you and never touch an engine's cost basis."}{!eng?" Warranty needs one of our engines linked on the Intake tab.":""}</div>
        {!warrantyJob&&(<div className="rc-card" style={{padding:12,marginBottom:12}}>
          {(j.types||[]).length===0?<div style={{fontSize:13,color:"var(--mt)"}}>Tick a job type to price it from your price list.</div>:(j.types||[]).map(t2=>(<div key={t2} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:14,padding:"2px 0"}}><span style={{color:"var(--tx2)"}}>{ecmTypeLabel(t2)}</span><span>{+ecmPrices(s)[t2]?$$(+ecmPrices(s)[t2]):<span style={{color:"var(--w)"}}>no price set</span>}</span></div>))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,padding:"6px 0 2px",borderTop:"1px solid var(--ln2)",marginTop:6}}><span>Price list total</span><span>{$$(ecmSuggest(s,j))}</span></div>
          <div className="rc-ecm-g2" style={{marginTop:8}}>{EI("priceOverride","Override price ($)","number","Blank uses the price list")}{EI("priceReason","Reason for the override")}</div>
          {ecmOver(j)&&!String(j.priceReason||"").trim()&&<div style={{fontSize:12.5,color:"var(--w)",marginTop:-4}}>Add a reason for the override before you bill it.</div>}
          <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:15,fontWeight:700,marginTop:8}}><span>Job price{ecmPartsSum(j)>0?" + parts":""}</span><span style={{color:"var(--act)"}}>{$$(ecmService(s,j)+ecmPartsSum(j))}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:13,color:"var(--mt)",marginTop:2,flexWrap:"wrap"}}><span>Labour cost at tech pay · labour profit</span><span>{$$(ecmLabour(j))} · <b style={{color:ecmService(s,j)-ecmLabour(j)<0?"var(--r)":"var(--g)"}}>{$$(ecmService(s,j)-ecmLabour(j))}</b></span></div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,flexWrap:"wrap"}}><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"ecm-prices"})}>Edit price list</button>{inv?<span style={{fontSize:13,color:"var(--g)"}}>✓ Billed on {inv.invNum||inv.id} · {$$(+j.billed||0)}</span>:<button className="rc-ba" disabled={!canBill} onClick={bill}>🧾 Bill this job</button>}{!inv&&!j.custId&&<span style={{fontSize:12.5,color:"var(--mt)"}}>Pick the customer on the Intake tab to bill it.</span>}</div>
        </div>)}
      </>)}
      {T==="verify"&&(<>
        {SEC("Faults after","Should be cleared or explained")}
        {FT("aFaults")}
        {TX("roadTest","Road-test notes",3)}
        {SEC("Dyno after","Optional")}
        {DY("dynoA")}
        {(()=>{const b=j.dynoB||{},a=j.dynoA||{};const rows=[["hp","Peak HP",""],["tq","Peak torque"," lb-ft"],["boost","Max boost"," psi"],["egt","Max EGT"," °C"]].filter(([k])=>+b[k]&&+a[k]);if(!rows.length)return null;return(<div className="rc-card" style={{padding:"4px 12px",marginBottom:12}}>{rows.map(([k,l,u])=>{const dl=+a[k]-+b[k];const good=k==="egt"?dl<=0:dl>=0;return(<div key={k} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"6px 0",borderBottom:"1px solid var(--ln2)",fontSize:14}}><span style={{color:"var(--tx2)"}}>{l}</span><span>{b[k]}{u} → {a[k]}{u}<b style={{color:good?"var(--g)":"var(--r)",marginLeft:8}}>{dl>0?"+":""}{Math.round(dl*10)/10}{u}</b></span></div>);})}</div>);})()}
        {SEC("Emissions check at release","Required to complete")}
        {EM("emisOut","at release")}
        {SEC("Customer sign-off")}
        <div className="rc-ecm-g2">{EI("signName","Customer name")}{EI("signDate","Date","date")}</div>
        <label style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:14,cursor:"pointer",margin:"2px 0 12px"}}><input type="checkbox" aria-label="Customer sign-off" checked={truthy(j.signOk)} onChange={e=>up({signOk:e.target.checked,...(e.target.checked&&!j.signDate?{signDate:isoToday()}:{})})} style={{marginTop:3}}/><span>Customer was shown the changes made and understands the warranty terms.</span></label>
        {SEC("AI review","Explains and flags only")}
        <div className="rc-card" style={{padding:12,marginBottom:12}}>{j.aiReview?<div style={{fontSize:13.5,whiteSpace:"pre-wrap",lineHeight:1.55}}>{j.aiReview}<div style={{fontSize:12,color:"var(--mt)",marginTop:6}}>Reviewed {String(j.aiAt||"").slice(0,10)}</div></div>:<div style={{fontSize:13,color:"var(--mt)",lineHeight:1.5}}>Sends the before and after numbers and any CSV, TXT or XML logs for a plain-language summary: what changed, anything abnormal, what to check next. It never suggests calibration values.</div>}
          <button className="rc-bs" style={{marginTop:10,color:"var(--p)",borderColor:"var(--p)"}} disabled={!!f.aiBusy} onClick={review}>{f.aiBusy?"Reviewing…":j.aiReview?"✨ Review again":"✨ Review job data"}</button></div>
        <div className="rc-card" style={{padding:12,marginBottom:4}}>{j.status==="complete"?<div style={{color:"var(--g)",fontWeight:600}}>✓ Completed {j.completedAt||""}. The 30, 60 and 90-day follow-ups are on the Schedule.</div>:(<>{emHold?<div style={{fontSize:13.5,color:"var(--r)",fontWeight:600}}>On hold for an emissions issue.</div>:miss.length?<div style={{fontSize:13.5,color:"var(--tx2)"}}>To complete: {miss.join(", ")}.</div>:<div style={{fontSize:13.5,color:"var(--g)"}}>Ready to complete.</div>}<button className="rc-ba" style={{marginTop:10}} disabled={!!miss.length||emHold} onClick={()=>up({status:"complete"})}>✓ Complete job</button></>)}</div>
      </>)}
      {T==="follow"&&(<>
        {j.status!=="complete"&&<div className="rc-ecm-ban info" style={{marginTop:12}}>Follow-ups are booked on the Schedule at 30, 60 and 90 days when the job is completed.</div>}
        {[30,60,90].map(n=>{const x=(j.fu||{})[n]||{};const ap=(s.schedule||[]).find(a=>+a.ecmJobId===j.id&&+a.fuDay===n);const setF=patch=>up({fu:{...(j.fu||{}),[n]:{...x,...patch,...(!x.date&&!patch.date?{date:isoToday()}:{})}}});const ch=fuelChg(fuB,x.fuel);const ra=+x.regenEvery;return(<div key={n} className="rc-card" style={{padding:12,margin:"12px 0 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}><b style={{fontSize:15}}>{n}-day follow-up</b><span style={{fontSize:12.5,color:x.date?"var(--g)":"var(--mt)"}}>{x.date?"✓ recorded "+x.date:ap?"due "+ap.date:j.completedAt?"due "+ecmDue(j.completedAt,n):"booked when the job completes"}</span></div>
          <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">Fuel economy (L/100 km){ch!=null&&<span style={{color:ch<=0?"var(--g)":"var(--r)",textTransform:"none",letterSpacing:0,marginLeft:6}}>{ch>0?"+":""}{ch.toFixed(1)}% vs before</span>}</label><input className="rc-fi" type="number" aria-label={n+"-day fuel economy"} value={x.fuel??""} onChange={e=>setF({fuel:e.target.value})}/></div>
            <div className="rc-fg"><label className="rc-fl">Km between regens{rgB>0&&ra>0&&<span style={{color:ra>=rgB?"var(--g)":"var(--r)",textTransform:"none",letterSpacing:0,marginLeft:6}}>{ra>=rgB?"+":""}{Math.round((ra-rgB)/rgB*100)}% vs before</span>}</label><input className="rc-fi" type="number" aria-label={n+"-day km between regens"} value={x.regenEvery??""} onChange={e=>setF({regenEvery:e.target.value})}/></div></div>
          <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">New faults</label><input className="rc-fi" aria-label={n+"-day new faults"} value={x.faults||""} onChange={e=>setF({faults:e.target.value})}/></div><div className="rc-fg"><label className="rc-fl">Customer comments</label><input className="rc-fi" aria-label={n+"-day customer comments"} value={x.comments||""} onChange={e=>setF({comments:e.target.value})}/></div></div>
          {x.date&&<div className="rc-fg" style={{maxWidth:220,marginBottom:0}}><label className="rc-fl">Recorded on</label><input className="rc-fi" type="date" value={x.date} onChange={e=>setF({date:e.target.value})}/></div>}
        </div>);})}
        {SEC("Comeback")}
        <label style={{display:"flex",gap:9,alignItems:"center",fontSize:14,cursor:"pointer",marginBottom:8}}><input type="checkbox" aria-label="Comeback" checked={truthy(j.comeback)} onChange={e=>up({comeback:e.target.checked})}/> The truck came back for this job</label>
        {truthy(j.comeback)&&TX("comebackNotes","What happened",2)}
      </>)}
      <div className="rc-fa">{C}<button className="rc-bs" onClick={()=>printEcm(s,j)}>🖨 Print job sheet</button>{T!=="work"&&canBill&&<button className="rc-bs" onClick={bill}>🧾 Bill this job</button>}{nxt&&<button className="rc-ba" onClick={()=>go(nxt)}>→ {ecmStLabel(nxt)}</button>}{j.status==="verify"&&<button className="rc-ba" disabled={!!miss.length} onClick={()=>up({status:"complete"})}>✓ Complete job</button>}</div>
    </div>,"rc-wmod");}
  if(s.modal==="pros-rec"){const list=(s.md&&s.md.list)||"prospects";const comp=list==="competitors";const r=resById(s,list,s.md&&s.md.id);
    if(!r)return W(<div><div className="rc-mt">Record not found</div><div style={{fontSize:14,color:"var(--mt)"}}>It may have been deleted. Undo from the toast if that was a mistake.</div><div className="rc-fa">{C}</div></div>);
    const td=isoToday();const cust=r.customerId?(s.customers||[]).find(c=>c.id===+r.customerId):null;const dnc=r.status==="do-not-contact";const canSell=!comp||isSalesShop(r);const late=fuDue(r,td);
    const up=patch=>d({type:"UPDATE",list,id:r.id,d:patch});
    const setStatus=v=>{if(v===(r.status||""))return;up({status:v,log:[...(r.log||[]),{date:td,by:CURRENT_USER,type:"note",outcome:"Status set to "+pstOf(v)[1],notes:""}]});};
    const kv=(l,v)=>v?(<div className="rc-kv"><div className="rc-fl">{l}</div><div style={{fontSize:14.5,whiteSpace:"pre-wrap"}}>{v}</div></div>):null;
    return W(<div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><div className="rc-mt" style={{margin:0}}>{r.name}</div>{!comp&&r.priority&&<span className={"rc-pri p"+r.priority} title="Priority">{r.priority}</span>}<PBadge st={r.status}/></div>
      <div style={{fontSize:14,color:"var(--tx2)",margin:"6px 0 12px"}}>{[comp?r.category:r.fleetType,r.city,r.region,kmTxt(r)&&kmTxt(r)+" from Medicine Hat"].filter(Boolean).join(" · ")}</div>
      {dnc&&<div className="rc-ecm-ban bad">Do not contact. Keep this record for reference only.</div>}
      {!comp&&r.pitch&&<div className="rc-pitch"><div className="rc-fl" style={{margin:"0 0 4px"}}>Pitch</div>{r.pitch}</div>}
      <div className="rc-contact">{nb(r.phone)&&<a className="rc-bs" href={telHref(r.phone)}>📞 {nb(r.phone)}</a>}{nb(r.website)&&<a className="rc-bs" href={webHref(r.website)} target="_blank" rel="noopener noreferrer">🌐 {String(r.website).replace(/^https?:\/\//i,"").replace(/\/$/,"")}</a>}{(nb(r.address)||r.city)&&<a className="rc-bs" href={mapHref(r)} target="_blank" rel="noopener noreferrer">📍 Map</a>}</div>
      <div className="rc-ecm-g2">{kv("Address",[nb(r.address),r.city].filter(Boolean).join(", "))}{kv("Contact",[r.contactName,r.contactRole].filter(Boolean).join(" · "))}</div>
      <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" aria-label="Status" value={r.status||""} onChange={e=>setStatus(e.target.value)} style={{appearance:"none"}}>{PST.map(([k,l])=>(<option key={k||"new"} value={k}>{l}</option>))}</select></div>
        <div className="rc-kv"><div className="rc-fl">Next follow-up</div><div style={{fontSize:14.5,color:late?"var(--w)":"var(--tx)",fontWeight:late?600:400,paddingTop:8}}>{r.nextFollowUp?r.nextFollowUp+(late?" · due":""):"None set"}</div></div></div>
      {comp?(<>
        <div className="rc-ecm-sec">Where they stand</div>
        <div className="rc-ecm-g">{kv("Duty class",r.duty)}{kv("Engine work",r.engineWork)}{kv("Specialty",r.specialty)}{kv("Mobile / 24 hr",r.mobile24hr)}<div className="rc-kv"><div className="rc-fl">Threat</div><Lvl v={r.threat} cols={THREAT_COL}/></div><div className="rc-kv"><div className="rc-fl">Sales prospect</div><Lvl v={r.salesProspect} cols={SALES_COL}/></div></div>
        <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">Sells engines?</label><select className="rc-fi" aria-label="Sells engines?" value={r.sellsEngines||""} onChange={e=>up({sellsEngines:e.target.value,lastChecked:td})} style={{appearance:"none"}}>{optsWith(SELLS_OPTS,r.sellsEngines).map(o=>(<option key={o} value={o}>{o}</option>))}</select></div><div className="rc-fg"><label className="rc-fl">Posted pricing?</label><select className="rc-fi" aria-label="Posted pricing?" value={r.postedPricing||""} onChange={e=>up({postedPricing:e.target.value,lastChecked:td})} style={{appearance:"none"}}>{optsWith(PRICING_OPTS,r.postedPricing).map(o=>(<option key={o} value={o}>{o}</option>))}</select></div></div>
        <div style={{fontSize:12.5,color:"var(--mt)",margin:"-4px 0 6px"}}>{r.lastChecked?"Last checked "+r.lastChecked:"Not checked yet"}. Changing either answer stamps today's date.</div>
      </>):(<>
        <div className="rc-ecm-sec">The fleet</div>
        <div className="rc-ecm-g">{kv("Haul",r.haul)}{kv("Fleet type",r.fleetType)}{kv("Trucks",r.truckCount)}</div>
      </>)}
      {(r.engines||[]).length>0&&<div className="rc-kv"><div className="rc-fl">Engines they run</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.engines.map(k=>(<span key={k} className="rc-fb" style={{cursor:"default",textTransform:"none",letterSpacing:0}}>{ecmFamLabel(k)}</span>))}</div></div>}
      <div className="rc-ecm-g">{kv("Last contact",r.lastContact)}{kv("Flyer left",truthy(r.flyerLeft)?"Yes":"")}{comp&&kv("Trucks",r.truckCount)}</div>
      {kv("Research notes",r.notes)}
      {comp&&kv("My notes",r.myNotes)}
      {cust&&<div className="rc-ecm-ban info"><span style={{flex:1}}>Converted to a customer: {cust.name}.</span><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"cust-detail",d:cust})}>Open customer</button></div>}
      {comp&&(<>
        <div className="rc-ecm-sec">Price intel<span>What they charge, as we learn it</span></div>
        <div className="rc-card" style={{padding:"2px 12px",marginBottom:10}}>
          {(r.prices||[]).length===0?<div style={{fontSize:13,color:"var(--mt)",padding:"8px 0"}}>No prices yet.</div>:(r.prices||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(p=>(<div key={p.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--ln2)",fontSize:13.5,flexWrap:"wrap"}}><span style={{color:"var(--mt)",width:86}}>{p.date}</span><span style={{flex:1,minWidth:140}}>{p.item}{p.source?<span style={{display:"block",fontSize:12,color:"var(--mt)"}}>{p.source}</span>:null}</span><b>{String(p.price).trim()!==""&&!isNaN(+p.price)?$$(+p.price):p.price}</b><button className="rc-bs rc-bsr" aria-label={"Remove price for "+p.item} onClick={()=>up({prices:(r.prices||[]).filter(x=>x.id!==p.id)})}>×</button></div>))}
          <div className="rc-pi-add"><input className="rc-fi" type="date" aria-label="Price date" value={f.piDate||td} onChange={e=>set("piDate",e.target.value)}/><input className="rc-fi" list="pi-items" placeholder="Item, e.g. ISX15 long block" aria-label="Price item" value={f.piItem||""} onChange={e=>set("piItem",e.target.value)}/><input className="rc-fi" type="number" placeholder="$" aria-label="Price" value={f.piPrice||""} onChange={e=>set("piPrice",e.target.value)}/><input className="rc-fi" placeholder="Source" aria-label="Price source" value={f.piSrc||""} onChange={e=>set("piSrc",e.target.value)}/><button className="rc-bs" disabled={!String(f.piItem||"").trim()} onClick={()=>{up({prices:[...(r.prices||[]),{id:Date.now(),date:f.piDate||td,item:String(f.piItem).trim(),price:f.piPrice||"",source:String(f.piSrc||"").trim()}],lastChecked:td});sf(pp=>({...pp,piItem:"",piPrice:"",piSrc:""}));}}>+ Price</button></div>
          <datalist id="pi-items">{["ISX15 long block","X15 long block","DD15 long block","DD13 long block","MX-13 long block","C15 long block","D13 long block","MP8 long block","Engine swap labour","In-frame overhaul","Out-of-frame overhaul","ECM tune","Shop labour rate"].map(o=>(<option key={o} value={o}/>))}</datalist>
        </div>
      </>)}
      <div className="rc-ecm-sec">Activity</div>
      <div className="rc-card" style={{padding:"2px 12px",marginBottom:6}}>{(r.log||[]).length===0?<div style={{fontSize:13,color:"var(--mt)",padding:"8px 0"}}>Nothing logged yet.</div>:(r.log||[]).slice().reverse().map((e,x)=>(<div key={x} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid var(--ln2)",fontSize:13.5,flexWrap:"wrap"}}><span style={{color:"var(--mt)",width:86,flexShrink:0}}>{e.date}</span><span style={{fontWeight:600,width:52,textTransform:"capitalize"}}>{e.type}</span><span style={{flex:1,minWidth:160}}>{e.outcome}{e.flyer?" · flyer left":""}{e.notes?<span style={{display:"block",color:"var(--tx2)",whiteSpace:"pre-wrap"}}>{e.notes}</span>:null}</span>{e.by&&e.by!=="shop"&&<span style={{fontSize:12,color:"var(--mt)"}}>{e.by}</span>}</div>))}</div>
      <div className="rc-fa">{C}<button className="rc-bs rc-bsr" onClick={()=>{d({type:"DELETE",list,id:r.id});d({type:"CLOSE"});}}>Delete</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-pros",d:{...r,_list:list}})}>✎ Edit</button><button className="rc-bs" onClick={()=>d({type:"MODAL",v:"pros-log",d:{list,id:r.id,type:"note"}})}>+ Note</button>{canSell&&!cust&&!dnc&&<button className="rc-bs" onClick={()=>convertRec(list,r)}>✓ Convert to customer</button>}{canSell&&<button className="rc-ba" disabled={dnc} onClick={()=>d({type:"MODAL",v:"pros-log",d:{list,id:r.id}})}>📝 Log a visit</button>}</div>
    </div>,"rc-wmod");}
  if(s.modal==="edit-pros"){const list=(s.md&&s.md._list)||"prospects";const comp=list==="competitors";const engs=Array.isArray(f.engines)?f.engines:[];
    const SF=(k,l,opts)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><select className="rc-fi" value={f[k]||""} onChange={e=>set(k,e.target.value)} style={{appearance:"none"}}>{!opts.includes(f[k]||"")&&<option value={f[k]||""}>{f[k]||"—"}</option>}{opts.map(o=>(<option key={o} value={o}>{o}</option>))}</select></div>);
    const TXA=(k,l)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><textarea className="rc-fi" rows={2} value={f[k]||""} onChange={e=>set(k,e.target.value)} style={{resize:"vertical"}}/></div>);
    const save=()=>{const name=String(f.name||"").trim();if(!name)return;const orig=resById(s,list,s.md.id)||{};
      const keys=comp?["city","region","kmFromMH","address","phone","website","category","duty","engineWork","specialty","mobile24hr","threat","salesProspect","sellsEngines","postedPricing","notes","myNotes","contactName","contactRole","truckCount","nextFollowUp","lastContact","lastChecked"]:["city","region","kmFromMH","address","phone","website","haul","fleetType","priority","pitch","notes","contactName","contactRole","truckCount","nextFollowUp","lastContact"];
      const patch={name,engines:engs,flyerLeft:truthy(f.flyerLeft)};keys.forEach(k=>{const v=f[k]??"";patch[k]=k==="kmFromMH"?(String(v).trim()===""?"":+v||0):(typeof v==="string"?v.trim():v);});
      if(comp&&(patch.sellsEngines!==(orig.sellsEngines||"")||patch.postedPricing!==(orig.postedPricing||""))&&patch.lastChecked===(orig.lastChecked||""))patch.lastChecked=isoToday();
      d({type:"UPDATE",list,id:s.md.id,d:patch});d({type:"BACK"});};
    return W(<div><div className="rc-mt">{comp?"Edit Shop":"Edit Prospect"}</div>
      {F("name","Name")}
      <div className="rc-ecm-g">{F("city","City")}{F("region","Region")}{F("kmFromMH","km from Medicine Hat","number")}{F("address","Address")}{F("phone","Phone")}{F("website","Website")}</div>
      {comp?(<div className="rc-ecm-g">{F("category","Category")}{F("duty","Duty class")}{F("engineWork","Engine work")}{F("specialty","Specialty")}{F("mobile24hr","Mobile / 24 hr")}{SF("threat","Threat",["High","Medium","Low"])}{SF("salesProspect","Sales prospect",["High","Medium","Low","Supplier?"])}{SF("sellsEngines","Sells engines?",SELLS_OPTS)}{SF("postedPricing","Posted pricing?",PRICING_OPTS)}{F("lastChecked","Last checked","date")}</div>):(<>
        <div className="rc-ecm-g">{F("haul","Haul")}{F("fleetType","Fleet type")}{SF("priority","Priority",["A","B","C"])}</div>
        {TXA("pitch","Pitch")}
      </>)}
      <div className="rc-ecm-sec">Working info</div>
      <div className="rc-ecm-g">{F("contactName","Contact name")}{F("contactRole","Contact role")}{F("truckCount","Trucks","number")}{F("lastContact","Last contact","date")}{F("nextFollowUp","Next follow-up","date")}</div>
      <div className="rc-fg"><label className="rc-fl">Engines they run</label><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{ECM_FAMS.map(([k,l])=>(<button key={k} type="button" className={"rc-fb"+(engs.includes(k)?" on":"")} aria-pressed={engs.includes(k)} onClick={()=>set("engines",engs.includes(k)?engs.filter(x=>x!==k):[...engs,k])} style={{textTransform:"none",letterSpacing:0,fontSize:12.5}}>{l}</button>))}</div></div>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,cursor:"pointer",margin:"0 0 12px"}}><input type="checkbox" checked={truthy(f.flyerLeft)} onChange={e=>set("flyerLeft",e.target.checked)}/> Flyer left</label>
      {TXA("notes","Research notes")}
      {comp&&TXA("myNotes","My notes")}
      <div className="rc-fa"><button className="rc-bs" onClick={()=>d({type:"BACK"})}>Cancel</button><button className="rc-ba" onClick={save}>Save Changes</button></div>
    </div>,"rc-wmod");}
  if(s.modal==="pros-log"){const list=(s.md&&s.md.list)||"prospects";const r=resById(s,list,s.md&&s.md.id);
    if(!r)return W(<div><div className="rc-mt">Record not found</div><div className="rc-fa">{C}</div></div>);
    const td=isoToday();const type=f.lType||(s.md&&s.md.type)||"visit";const outcome=f.lOut!=null?f.lOut:"";
    const sugg={"Interested":"interested","Wants a quote":"interested","Not a fit":"not-a-fit","Do not contact":"do-not-contact"}[outcome]||((r.status||"")===""?"contacted":(r.status||""));
    const st=f.lSt!=null?f.lSt:(type==="note"?(r.status||""):sugg);
    const next=f.lNext!=null?f.lNext:(r.nextFollowUp&&r.nextFollowUp>td?r.nextFollowUp:"");
    const OUT=["Interested","Wants a quote","Not right now","Left info","No answer / closed","Not a fit","Do not contact"];
    const ok=!!(String(outcome).trim()||String(f.lNotes||"").trim());
    const save=()=>{if(!ok)return;const entry={date:td,by:CURRENT_USER,type,outcome:String(outcome).trim(),notes:String(f.lNotes||"").trim(),...(type==="visit"&&truthy(f.lFlyer)?{flyer:true}:{})};
      d({type:"UPDATE",list,id:r.id,d:{log:[...(r.log||[]),entry],...(type!=="note"?{lastContact:td}:{}),nextFollowUp:next,status:st,...(entry.flyer?{flyerLeft:true}:{})}});d({type:"BACK"});};
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>{type==="note"?"Add a Note":"Log a "+({visit:"Visit",call:"Call",email:"Email"}[type])}</div><div style={{fontSize:14,color:"var(--tx2)",marginBottom:12}}>{r.name}{r.city?" · "+r.city:""}</div>
      <div className="rc-fg"><label className="rc-fl">What happened</label><div className="rc-seg four" role="group" aria-label="Contact type">{[["visit","Visit"],["call","Call"],["email","Email"],["note","Note"]].map(([k,l])=>(<button key={k} type="button" className={type===k?"on":""} aria-pressed={type===k} onClick={()=>set("lType",k)}>{l}</button>))}</div></div>
      {type!=="note"&&<div className="rc-fg"><label className="rc-fl">Outcome</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{OUT.map(o=>(<button key={o} type="button" className={"rc-fb"+(outcome===o?" on":"")} aria-pressed={outcome===o} onClick={()=>sf(pp=>({...pp,lOut:o,lSt:undefined}))} style={{textTransform:"none",letterSpacing:0}}>{o}</button>))}</div><input className="rc-fi" aria-label="Outcome" placeholder="Or type the outcome" value={outcome} onChange={e=>sf(pp=>({...pp,lOut:e.target.value}))}/></div>}
      <div className="rc-fg"><label className="rc-fl">Notes</label><textarea className="rc-fi" rows={3} aria-label="Notes" value={f.lNotes||""} onChange={e=>set("lNotes",e.target.value)} style={{resize:"vertical"}}/></div>
      {type==="visit"&&<label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,cursor:"pointer",margin:"0 0 12px"}}><input type="checkbox" aria-label="Flyer left" checked={truthy(f.lFlyer)} onChange={e=>set("lFlyer",e.target.checked)}/> Flyer left</label>}
      <div className="rc-fg"><label className="rc-fl">Next follow-up</label><div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><input className="rc-fi" type="date" aria-label="Next follow-up" value={next} onChange={e=>set("lNext",e.target.value)} style={{width:180}}/>{[["Today",0],["+1 week",7],["+2 weeks",14],["+1 month",30]].map(([l,n])=>(<button key={l} type="button" className="rc-fb" onClick={()=>set("lNext",addDays(td,n))}>{l}</button>))}{next&&<button type="button" className="rc-fb" onClick={()=>set("lNext","")}>None</button>}</div></div>
      <div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" aria-label="Status" value={st} onChange={e=>set("lSt",e.target.value)} style={{appearance:"none",maxWidth:280}}>{PST.map(([k,l])=>(<option key={k||"new"} value={k}>{l}</option>))}</select></div>
      <div className="rc-fa"><button className="rc-bs" onClick={()=>d({type:"BACK"})}>Cancel</button><button className="rc-ba" disabled={!ok} onClick={save}>Save</button></div>
    </div>);}
  if(s.modal==="pros-add"){const list=(s.md&&s.md.list)||"prospects";const comp=list==="competitors";const regs=[...new Set([...(s.prospects||[]),...(s.competitors||[])].map(r=>r.region).filter(Boolean))].sort();
    const SF=(k,l,opts,dflt)=>(<div className="rc-fg"><label className="rc-fl">{l}</label><select className="rc-fi" value={f[k]||dflt||""} onChange={e=>set(k,e.target.value)} style={{appearance:"none"}}>{opts.map(o=>(<option key={o} value={o}>{o||"—"}</option>))}</select></div>);
    const name=String(f.name||"").trim();
    const save=()=>{if(!name)return;const base={id:Date.now(),name,city:String(f.city||"").trim(),region:f.region||"",kmFromMH:String(f.kmFromMH||"").trim()===""?"":+f.kmFromMH||0,address:String(f.address||"").trim(),phone:String(f.phone||"").trim(),website:String(f.website||"").trim(),notes:String(f.notes||"").trim()};
      const rec=comp?compWork({...base,category:String(f.category||"").trim(),duty:f.duty||"HD",engineWork:"",sellsEngines:f.sellsEngines||"Unknown",postedPricing:f.postedPricing||"Not verified",mobile24hr:"",specialty:String(f.specialty||"").trim(),threat:f.threat||"Low",salesProspect:f.salesProspect||"Medium"}):resWork({...base,haul:String(f.haul||"").trim(),fleetType:f.fleetType||"",priority:f.priority||"B",pitch:String(f.pitch||"").trim()});
      d({type:"ADD",list,d:rec,label:(comp?"Shop":"Prospect")+" added: "+name});d({type:"MODAL",v:"pros-rec",d:{list,id:rec.id}});};
    return W(<div><div className="rc-mt">{comp?"Add a Shop":"Add a Prospect"}</div>
      {F("name","Name")}
      <div className="rc-ecm-g2">{F("city","City")}<div className="rc-fg"><label className="rc-fl">Region</label><input className="rc-fi" list="res-regions" value={f.region||""} onChange={e=>set("region",e.target.value)} placeholder="Region"/><datalist id="res-regions">{regs.map(x=>(<option key={x} value={x}/>))}</datalist></div>{F("kmFromMH","km from Medicine Hat","number")}{F("phone","Phone")}{F("address","Address")}{F("website","Website")}</div>
      {comp?(<div className="rc-ecm-g2">{F("category","Category")}{SF("duty","Duty class",["HD","Both","LD","MD","Industrial","Off-highway"],"HD")}{F("specialty","Specialty")}{SF("threat","Threat",["Low","Medium","High"],"Low")}{SF("salesProspect","Sales prospect",["Medium","High","Low","Supplier?"],"Medium")}{SF("sellsEngines","Sells engines?",SELLS_OPTS,"Unknown")}</div>):(<>
        <div className="rc-ecm-g2">{F("haul","Haul")}{SF("fleetType","Fleet type",["","Local Fleet","Small / Owner-Operator","Regional Carrier","Large / National (corporate maintenance)","Hotshot / Light-Duty"])}{SF("priority","Priority",["B","A","C"],"B")}</div>
        <div className="rc-fg"><label className="rc-fl">Pitch</label><textarea className="rc-fi" rows={2} value={f.pitch||""} onChange={e=>set("pitch",e.target.value)} style={{resize:"vertical"}}/></div>
      </>)}
      <div className="rc-fg"><label className="rc-fl">Notes</label><textarea className="rc-fi" rows={2} value={f.notes||""} onChange={e=>set("notes",e.target.value)} style={{resize:"vertical"}}/></div>
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!name} onClick={save}>{comp?"Add Shop":"Add Prospect"}</button></div>
    </div>);}
  if(s.modal==="route-day"){const town=f.rTown||"";const region=f.rRegion||"";const picked=town||region;const skip=f.rSkip||[];
    // Priority A fleets with no visit logged yet, minus customers, not-a-fits and do-not-contacts.
    const cand=(s.prospects||[]).filter(r=>r.priority==="A"&&!visited(r)&&![...PST_OFF,"customer"].includes(r.status||""));
    const tally=fn=>Object.entries(cand.reduce((o,r)=>{const k=fn(r);if(k)o[k]=(o[k]||0)+1;return o;},{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const towns=tally(r=>townOf(r.city)),regs=tally(r=>r.region);
    const stops=!picked?[]:cand.filter(r=>town?String(r.city||"").toLowerCase().includes(town.toLowerCase()):r.region===region).sort((a,b)=>(+a.kmFromMH||0)-(+b.kmFromMH||0)||String(a.name||"").localeCompare(String(b.name||"")));
    const on=stops.filter(r=>!skip.includes(r.id));
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>Route Day</div><div style={{fontSize:13,color:"var(--mt)",marginBottom:12,lineHeight:1.5}}>Priority A fleets you haven't visited yet, nearest first. Untick any you'll skip, then print the route sheet.</div>
      <div className="rc-ecm-g2"><div className="rc-fg"><label className="rc-fl">Town</label><select className="rc-fi" aria-label="Town" value={town} onChange={e=>sf(pp=>({...pp,rTown:e.target.value,rRegion:"",rSkip:[]}))} style={{appearance:"none"}}><option value="">Pick a town…</option>{towns.map(([x,n])=>(<option key={x} value={x}>{x} · {n}</option>))}</select></div><div className="rc-fg"><label className="rc-fl">…or a region</label><select className="rc-fi" aria-label="Region" value={region} onChange={e=>sf(pp=>({...pp,rRegion:e.target.value,rTown:"",rSkip:[]}))} style={{appearance:"none"}}><option value="">Pick a region…</option>{regs.map(([x,n])=>(<option key={x} value={x}>{x} · {n}</option>))}</select></div></div>
      {picked&&(stops.length===0?<div style={{fontSize:13.5,color:"var(--mt)",padding:"6px 0"}}>No Priority A fleets left to visit in {picked}.</div>:<div className="rc-card" style={{padding:"2px 12px",marginBottom:8,maxHeight:380,overflowY:"auto"}}>{stops.map(r=>(<label key={r.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid var(--ln2)",cursor:"pointer"}}><input type="checkbox" aria-label={"Include "+r.name} checked={!skip.includes(r.id)} onChange={e=>set("rSkip",e.target.checked?skip.filter(x=>x!==r.id):[...skip,r.id])} style={{marginTop:4}}/><span style={{flex:1,minWidth:0}}><span style={{fontWeight:600,fontSize:14}}>{r.name}</span><span style={{display:"block",fontSize:12.5,color:"var(--mt)"}}>{[nb(r.address),r.city].filter(Boolean).join(", ")}{nb(r.phone)?" · "+nb(r.phone):""}</span></span><span style={{fontSize:12.5,color:"var(--tx2)",whiteSpace:"nowrap"}}>{kmTxt(r)}</span></label>))}</div>)}
      {on.length>ROUTE_PAGE&&<div style={{fontSize:13,color:"var(--w)",margin:"2px 0 8px",lineHeight:1.5}}>{on.length} stops prints on about {Math.ceil(on.length/ROUTE_PAGE)} pages. One page holds {ROUTE_PAGE}, so untick a few to keep it to one sheet.</div>}
      <div className="rc-fa">{C}<button className="rc-ba" disabled={!on.length} onClick={()=>printRoute(on,picked)}>🖨 Print route sheet{on.length?" · "+on.length+" stops":""}</button></div>
    </div>);}
  // New Invoice. Tax from the customer's province, terms give the due date, every line needs a description.
  // A linked engine is marked sold only when the box says so (a deposit on an engine in reman doesn't sell it),
  // at the price on this invoice, so the sales feed records what it really sold for.
  if(s.modal==="add-inv"){const eng=f.engineId?engById(s,f.engineId):null;const rate=taxPick();const doc={items:lines,taxRate:rate};
    const canSell=!!eng&&engStatus(eng)!=="sold";const sell=canSell&&(f.markSold!=null?!!f.markSold:["available","on-hold"].includes(engStatus(eng)));
    const engLine=lines.find(l=>l.kind==="engine");const salePrice=f.salePrice!=null&&f.salePrice!==""?+f.salePrice:engLine?(+engLine.q||0)*(+engLine.r||0):(+(eng&&eng.price)||0);
    const why=custWhy()||lineWhy()||(sell&&!(salePrice>0)?"Enter the engine's sale price.":"");
    const create=()=>{if(why)return;const eid=+f.engineId||0;const nid=Date.now();const items=Mny.usedLines(lines);const date=f.date||isoToday(),due=f.due||"Net 30";
      const cid=custFor();d({type:"ADD",list:"invoices",d:{id:nid,invNum:f.invNum||"INV-"+String(nid).slice(-6),custId:cid,engineId:eid,date,due,dueDate:Mny.dueDateOf({date,due}),taxRate:rate,items,status:"pending"}});
      [...new Set(items.map(l=>l.jobId).filter(Boolean))].forEach(jid=>d({type:"UPDATE",list:"jobs",id:jid,d:{invoiceId:nid,charge:items.filter(l=>l.jobId===jid).reduce((a,l)=>a+(+l.q||0)*(+l.r||0),0)}}));
      [...new Set(items.map(l=>l.ecmJobId).filter(Boolean))].forEach(eid2=>d({type:"UPDATE",list:"ecmJobs",id:eid2,d:{invoiceId:nid,billed:items.filter(l=>l.ecmJobId===eid2).reduce((a,l)=>a+(+l.q||0)*(+l.r||0),0)}}));
      if(eid&&sell){if(salePrice!==(+eng.price||0))d({type:"UPDATE",list:"inventory",id:eid,d:{price:salePrice}});d({type:"UPDATE",list:"inventory",id:eid,d:{status:"sold"}});}
      d({type:"CLOSE"});};
    return W(<div><div className="rc-mt">New Invoice</div>{CS(true)}{ES()}
      {canSell&&<div className="rc-inv-sell"><label className="rc-chk"><input type="checkbox" checked={sell} onChange={e=>set("markSold",e.target.checked)}/> This invoice sells {eng.name||eng.sku||"the engine"}: mark it sold</label>
        {sell?<div className="rc-fg" style={{marginTop:8}}><label className="rc-fl" htmlFor="f-salePrice">Engine sale price, before tax</label><input id="f-salePrice" className="rc-fi" type="number" value={f.salePrice!=null?f.salePrice:String(salePrice||"")} onChange={e=>set("salePrice",e.target.value)}/><div className="rc-hint">The sale goes in the sales feed at this price, and its warranty starts.</div></div>
          :<div className="rc-hint">Off for a deposit. Mark the engine sold when it's paid for.</div>}</div>}
      {F("invNum","Invoice #")}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{F("date","Date")}{TERMSEL()}</div>{TAXSEL(rate)}
      <div className="rc-fl">Items</div>{LI()}{TOT(doc)}{WHY(why)}
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!!why} onClick={create}>Create</button></div></div>);}

  // EDIT forms
  if(s.modal==="edit-cust")return EFM("Edit Customer","customers",[["name","Name"],["phone","Phone","tel"],["email","Email","email"],["type","Type",CUST_TYPES],["province","Province",PROV_OPTS],["vehicles","Vehicles"],["visits","Visits","number"],["notes","Notes"],["tags","Tags"]],f=>({...f,spent:+f.spent||0,visits:+f.visits||0,vehicles:(f.vehicles||"").split(",").map(v=>v.trim()).filter(Boolean),tags:(f.tags||"").split(",").map(t=>t.trim()).filter(Boolean)}));
  if(s.modal==="edit-time")return W(<div><div className="rc-mt">Edit Time</div><div className="rc-fg"><label className="rc-fl">Technician</label><select className="rc-fi" value={f.tech||""} onChange={e=>{const v=e.target.value;const emp=(s.employees||[]).find(x=>(x.nick||x.name)===v);set("tech",v);if(emp)set("rate",String(emp.rate||0));}} style={{appearance:"none"}}><option value="">Select tech...</option>{(s.employees||[]).filter(e=>e.status==="active").map(e=>(<option key={e.id} value={e.nick||e.name}>{e.name}</option>))}</select></div>{[["date","Date"],["hours","Hours","number"],["rate","Rate ($/hr)","number"],["notes","Notes"]].filter(([k])=>owner||k!=="rate").map(([k,l,t])=>F(k,l,t))}<div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"timeEntries",id:s.md.id,d:{tech:f.tech,date:f.date,hours:+f.hours||0,rate:+f.rate||0,notes:f.notes||""}});const jb=(s.jobs||[]).find(x=>x.id===s.md.jobId);d(jb?{type:"MODAL",v:"job-detail",d:jb}:{type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="edit-part"){const eng=isEngine({cat:f.cat});return W(<div><div className="rc-mt">Edit {eng?"Engine":"Part"}</div>{PH()}{[["name","Name"],["sku",eng?"SKU · leave blank for the next RC- number":"SKU"],["cat","Category"]].map(([k,l,t])=>F(k,l,t))}{eng&&(()=>{const pre=engSkuPrefix(f);if(String(f.sku||"").trim().toUpperCase().startsWith(pre+"-"))return null;const nx=nextEngineSku(s.inventory,f);return <button type="button" className="rc-lnk rc-sku-use" onClick={()=>set("sku",nx)}>↻ Use {nx}</button>;})()}{eng?(<><div className="rc-fl" style={{marginTop:8}}>Engine identity</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{F("serial","ESN / Serial")}{F("cpl","CPL / AR#")}{F("arrangement","Arrangement")}{F("year","Year")}{F("ratedHp","Rated HP")}{F("oilCap","Oil Capacity")}</div>{F("sourceCore","Source Core")}{F("condition","Condition")}<div className="rc-fg"><label className="rc-fl">Lifecycle Status</label><select className="rc-fi" value={f.status||"available"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}>{ENG_STATUSES.map(st=>(<option key={st} value={st}>{engStatusLabel(st)}</option>))}</select></div><div className="rc-fl" style={{marginTop:8}}>Cost basis breakdown</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{F("costCore","Core Purchase","number")}{F("costFreight","Inbound Freight","number")}{F("costParts","Parts Kit (flat $ — itemized log is on the passport)","number")}{F("costLabor","Machine + Assembly","number")}</div>{F("price","Sell Price","number")}</>):(<>{[["cost","Cost","number"],["price","Price","number"],["qty","Qty","number"],["reorder","Reorder","number"],["condition","Condition"],["serial","Serial"]].map(([k,l,t])=>F(k,l,t))}</>)}{F("notes","Notes")}<div className="rc-fa">{X}<button className="rc-ba" disabled={uploading} onClick={()=>{d({type:"UPDATE",list:"inventory",id:s.md.id,d:{...f,qty:+f.qty||(eng?1:0),reorder:+f.reorder||0,price:+f.price||0,cost:+f.cost||0,costCore:+f.costCore||0,costFreight:+f.costFreight||0,costParts:+f.costParts||0,costLabor:+f.costLabor||0}});d({type:"CLOSE"});}}>Save Changes</button></div></div>);}
  if(s.modal==="edit-appt")return W(<div><div className="rc-mt">Edit Appointment</div>{CS()}{[["date","Date"],["time","Time"],["duration","Duration","number"]].map(([k,l,t])=>F(k,l,t))}{TS()}{F("service","Service")}<div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" value={f.status||"pending"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}><option value="pending">Pending</option><option value="confirmed">Confirmed</option></select></div><div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"schedule",id:s.md.id,d:{...f,custId:+f.custId||s.md.custId,duration:+f.duration||120}});d({type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="edit-emp")return EFM("Edit Employee","employees",[["name","Name"],["nick","Short Name"],["role","Role"],["phone","Phone"],["rate","Rate","number"],["hrs","Hours","number"],["specialties","Specialties"],["certs","Certs"],["hireDate","Hired"]].filter(([k])=>owner||k!=="rate"),f=>({...f,rate:+f.rate||0,hrs:+f.hrs||0,specialties:(f.specialties||"").split(",").map(x=>x.trim()).filter(Boolean),certs:(f.certs||"").split(",").map(x=>x.trim()).filter(Boolean)}));
  if(s.modal==="edit-expense")return EFM("Edit Expense","expenses",[["cat","Category"],["amount","Amount","number"],["freq","How often",Mny.EXP_FREQS],["notes","Notes"]],f=>({...f,freq:Mny.freqKey(f.freq),amount:+f.amount||0}));
  if(s.modal==="edit-lead")return EFM("Edit Lead","leads",[["name","Name"],["phone","Phone"],["interest","Interest"],["source","Source"],["province","Province"],["notes","Notes"]],f=>f);
  if(s.modal==="edit-social")return EFM("Edit Social","social",[["platform","Platform"],["handle","Handle"],["followers","Followers","number"],["posts","Posts","number"],["engagement","Engage (%)","number"]],f=>({...f,followers:+f.followers||0,posts:+f.posts||0,engagement:+f.engagement||0}));
  if(s.modal==="edit-campaign")return EFM("Edit Campaign","campaigns",[["name","Name"],["platform","Platform"],["type","Type"],["status","Status"],["reach","Reach","number"],["leads","Leads","number"],["spent","Spent","number"],["budget","Budget","number"],["notes","Notes"]],f=>({...f,reach:+f.reach||0,leads:+f.leads||0,spent:+f.spent||0,budget:+f.budget||0}));
  if(s.modal==="edit-inv"){const rate=f.taxRate!=null&&f.taxRate!==""?+f.taxRate:Mny.taxRateOf(s.md);const doc={items:(s.md&&s.md.items)||[],taxRate:rate};
    return W(<div><div className="rc-mt">Edit Invoice</div>{CS()}{F("invNum","Invoice #")}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{F("date","Date")}{TERMSEL()}</div>{TAXSEL(rate)}<div className="rc-fg"><label className="rc-fl" htmlFor="f-status">Status</label><select id="f-status" className="rc-fi" value={f.status||"pending"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>{TOT(doc)}
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{const date=f.date||Mny.docDate(s.md),due=f.due||"Net 30";d({type:"UPDATE",list:"invoices",id:s.md.id,d:{invNum:f.invNum,custId:+f.custId||s.md.custId,date,due,dueDate:Mny.dueDateOf({date,due}),taxRate:rate,status:f.status||"pending",...(f.status==="paid"&&s.md.status!=="paid"?{paidDate:isoToday()}:{})}});d({type:"CLOSE"});}}>Save</button></div></div>);}
  if(s.modal==="edit-quote")return EFM("Edit Quote","quotes",[["quoteNum","Quote #"],["description","Description"],["date","Date"],["validUntil","Valid Until"],["notes","Notes"],["status","Status"]],f=>f);
  if(s.modal==="edit-ship")return EFM("Edit Shipment","shipments",[["carrier","Carrier"],["tracking","Tracking #"],["freightCost","Freight Cost","number"],["shipDate","Ship Date"],["estDelivery","Est. Delivery"],["origin","Origin"],["destination","Destination"],["notes","Notes"]],f=>({...f,freightCost:+f.freightCost||0}));
  if(s.modal==="edit-core")return W(<div><div className="rc-mt">Edit Core Return</div>{CS()}{[["engineName","Engine Name"],["deposit","Core Deposit ($)","number"],["dueDate","Due Date"],["notes","Notes"]].map(([k,l,t])=>F(k,l,t))}<div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" value={f.status||"pending"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}>{["pending","received","inspected","accepted","rejected","credited"].map(st=>(<option key={st} value={st}>{st}</option>))}</select></div><div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"cores",id:s.md.id,d:{...f,custId:+f.custId||s.md.custId,deposit:+f.deposit||0}});d({type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="edit-po")return W(<div><div className="rc-mt">Edit Purchase Order</div>{[["vendor","Vendor"],["orderDate","Order Date"],["eta","ETA"],["notes","Notes"]].map(([k,l])=>F(k,l))}<div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" value={f.status||"ordered"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}>{["ordered","shipped","received"].map(st=>(<option key={st} value={st}>{st}</option>))}</select></div><div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"purchaseOrders",id:s.md.id,d:f});d({type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="edit-warranty")return W(<div><div className="rc-mt">Edit Warranty</div>{CS()}{[["engineName","Engine Name"],["warrantyPeriod","Warranty Period"],["startDate","Start Date"],["expiryDate","Expiry Date"],["claimNotes","Notes"]].map(([k,l])=>F(k,l))}<div className="rc-fg"><label className="rc-fl">Status</label><select className="rc-fi" value={f.status||"active"} onChange={e=>set("status",e.target.value)} style={{appearance:"none"}}>{["active","expired","claimed"].map(st=>(<option key={st} value={st}>{st}</option>))}</select></div><div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"warranties",id:s.md.id,d:{...f,custId:+f.custId||s.md.custId}});d({type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="edit-comm")return W(<div><div className="rc-mt">Edit Communication</div>{CS()}<div className="rc-fg"><label className="rc-fl">Type</label><select className="rc-fi" value={f.type||"call"} onChange={e=>set("type",e.target.value)} style={{appearance:"none"}}><option value="call">Call</option><option value="email">Email</option><option value="text">Text</option><option value="note">Note</option></select></div>{[["date","Date"],["summary","Summary"],["followUp","Follow-Up Date"]].map(([k,l])=>F(k,l))}<div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{d({type:"UPDATE",list:"commsLog",id:s.md.id,d:{...f,custId:+f.custId||s.md.custId}});d({type:"CLOSE"});}}>Save</button></div></div>);
  if(s.modal==="add-content")return FM("Add Calendar Entry",[["day","Day",[["","—"],["Mon","Monday"],["Tue","Tuesday"],["Wed","Wednesday"],["Thu","Thursday"],["Fri","Friday"],["Sat","Saturday"],["Sun","Sunday"]]],["type","Content Type"],["platform","Platform(s)"],["notes","Notes"]],()=>f.day&&f.type&&d({type:"ADD",list:"contentCalendar",d:{day:f.day,type:f.type,platform:f.platform||"",notes:f.notes||""}}),(!f.day||!(f.type||"").trim())&&"Pick a day and the content type.");
  if(s.modal==="edit-content")return EFM("Edit Calendar Entry","contentCalendar",[["day","Day"],["type","Content Type"],["platform","Platform(s)"],["notes","Notes"]],f=>f);
  if(s.modal==="add-injector")return W(<div><div className="rc-mt">Add Injector</div>{[["brand","Brand"],["engine","Engine Model"],["family","Family / Series"],["esn","ESN Prefix / CPL / AR#"],["year","Year"],["oem","OEM Part #"],["aftermarket","Aftermarket #"],["type","Type"],["hp","HP / kW"],["cond","Condition"],["qty","Qty","number"],["cost","Cost ($)","number"],["sell","Sell ($)","number"],["notes","Notes"]].map(([k,l,t])=>F(k,l,t))}{WHY(!(f.brand||"").trim()&&"Add the brand.")}<div className="rc-fa">{X}<button className="rc-ba" disabled={!!(!(f.brand||"").trim()&&"Add the brand.")} onClick={()=>f.brand&&d({type:"ADD",list:"parts",d:{...f,qty:+f.qty||0,cost:+f.cost||0,sell:+f.sell||0}})}>Save</button></div></div>);
  if(s.modal==="edit-injector")return EFM("Edit Injector","parts",[["brand","Brand"],["engine","Engine Model"],["family","Family / Series"],["esn","ESN Prefix / CPL / AR#"],["year","Year"],["oem","OEM Part #"],["aftermarket","Aftermarket #"],["type","Type"],["hp","HP / kW"],["cond","Condition"],["qty","Qty","number"],["cost","Cost ($)","number"],["sell","Sell ($)","number"],["notes","Notes"]],f=>({...f,qty:+f.qty||0,cost:+f.cost||0,sell:+f.sell||0}));

  // ── Diagnosis history ──
  if(s.modal==="add-dx"||s.modal==="edit-dx"){const editing=s.modal==="edit-dx";const eng=engById(s,f.engineId);const sy=f.symptoms||[];const tog=t=>set("symptoms",sy.includes(t)?sy.filter(x=>x!==t):[...sy,t]);const parts=f.parts||[];const prior=dxMatches(s,eng,sy,editing&&s.md?s.md.id:null);const known=eng?issuesFor(s,eng).filter(is=>!sy.length||(is.symptoms||[]).some(y=>sy.includes(y))):[];const ejobs=(s.jobs||[]).filter(j=>eng&&j.engineId===eng.id);
    const suggest=async()=>{if(!eng||f.aiBusy)return;set("aiBusy",true);const ctx=known.slice(0,6).map(is=>"- "+is.title+": "+(is.causes||"")).join("\n");const pr=prior.slice(0,5).map(x=>"- "+(x.date||"")+" "+(x.symptoms||[]).join("/")+": "+(x.findings||"")+(x.fix?" → "+x.fix:"")).join("\n");const r=await askClaude(`You are a senior heavy-duty diesel technician at Rollin Coal (Medicine Hat, AB). Engine: ${eng.name}${eng.serial||eng.esn?" ESN "+(eng.serial||eng.esn):""}${eng.year?" year "+eng.year:""}. Symptoms: ${sy.join(", ")||"none given"}. Fault codes: ${f.codes||"none"}. Findings so far: ${f.findings||"none"}.\nKnown issues on file for this engine family:\n${ctx||"(none)"}\nPrior shop diagnoses on this family:\n${pr||"(none)"}\nGive the 3-5 most likely causes, ranked. For each: the single quickest check to confirm or rule it out, and what the fix usually takes. Plain text, numbered, under 220 words, no markdown.`);set("aiBusy",false);set("ai",r);};
    return W(<div><div className="rc-mt">{editing?"Edit Diagnosis":"Log Diagnosis"}</div>{eng&&<div style={{fontSize:13,color:"var(--tx2)",margin:"-6px 0 10px"}}>{eng.name}{eng.serial||eng.esn?" · ESN "+(eng.serial||eng.esn):""}</div>}
      {!(s.md&&s.md.engineId)&&!editing?ES():null}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{F("date","Date")}<div className="rc-fg"><label className="rc-fl">Technician</label><select className="rc-fi" value={f.tech||""} onChange={e=>{const v=e.target.value;const emp=(s.employees||[]).find(x=>(x.nick||x.name)===v);set("tech",v);if(emp&&!(+f.rate>0))set("rate",String(emp.rate||0));}} style={{appearance:"none"}}><option value="">Select tech...</option>{(s.employees||[]).filter(e=>e.status==="active").map(e=>(<option key={e.id} value={e.nick||e.name}>{e.name}</option>))}</select></div></div>
      <div className="rc-fg"><label className="rc-fl">Symptoms <span style={{textTransform:"none",letterSpacing:0,color:"var(--ft)"}}>— tap all that apply</span></label>{SYM(sy,tog)}</div>
      {eng&&sy.length>0&&(prior.length>0||known.length>0)&&<div style={{border:"1px solid var(--ln)",background:"var(--in)",borderRadius:9,padding:"8px 11px",fontSize:13,marginBottom:10,lineHeight:1.6}}>{prior.length>0&&<div><span style={{color:"var(--w)",fontWeight:700}}>{prior.length}×</span> <span style={{color:"var(--tx2)"}}>seen before on {familyLabel(eng)} in this shop</span>{prior.slice(0,3).map(x=>(<div key={x.id} style={{color:"var(--tx2)",fontSize:12,paddingLeft:8}}>· {x.date} — {x.findings||(x.symptoms||[]).join(", ")}{x.fix?" → "+x.fix:""}</div>))}</div>}{known.length>0&&<div style={{marginTop:prior.length?4:0}}><span style={{color:"var(--act)",fontWeight:700}}>{known.length}</span> <span style={{color:"var(--tx2)"}}>matching known issue{known.length>1?"s":""} — tap to link:</span>{known.slice(0,4).map(is=>(<div key={is.id} style={{fontSize:12,paddingLeft:8,color:"var(--tx)",cursor:"pointer"}} onClick={()=>set("issueId",String(f.issueId)===String(is.id)?"":String(is.id))}>· {is.title}{String(f.issueId)===String(is.id)&&<span style={{color:"var(--g)"}}> ✓ linked</span>}</div>))}</div>}</div>}
      {F("codes","Fault codes (SPN/FMI, P-codes)")}
      {TA("findings","Findings — what you found")}
      {TA("fix","Fix — what was done")}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><div className="rc-fg"><label className="rc-fl">Outcome</label><select className="rc-fi" value={f.outcome||"open"} onChange={e=>set("outcome",e.target.value)} style={{appearance:"none"}}>{DX_OUTCOMES.map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</select></div>{F("hours","Hours","number")}{F("rate","Rate ($/hr)","number")}</div>
      <p style={{fontSize:11,color:"var(--mt)",margin:"-4px 0 8px"}}>Hours × rate and parts below land on this engine's cost basis automatically.</p>
      {ejobs.length>0&&<div className="rc-fg"><label className="rc-fl">Work order</label><select className="rc-fi" value={f.jobId||""} onChange={e=>set("jobId",e.target.value)} style={{appearance:"none"}}><option value="">Not linked</option>{ejobs.map(j=>(<option key={j.id} value={j.id}>{j.service} · {j.status}</option>))}</select></div>}
      <div className="rc-fg"><label className="rc-fl">Parts used</label>{parts.map((p,x)=>(<div key={x} style={{display:"grid",gridTemplateColumns:"1fr 80px 28px",gap:6,marginBottom:6}}><input className="rc-fi" placeholder="Part" value={p.d||""} onChange={e=>{const np=[...parts];np[x]={...np[x],d:e.target.value};set("parts",np);}}/><input className="rc-fi" type="number" placeholder="$" value={p.v===0?"":(p.v||"")} onChange={e=>{const np=[...parts];np[x]={...np[x],v:e.target.value};set("parts",np);}}/><button className="rc-bs" style={{padding:"8px 0"}} onClick={()=>set("parts",parts.filter((_,y)=>y!==x))}>×</button></div>))}<button className="rc-bs" onClick={()=>set("parts",[...parts,{d:"",v:""}])}>+ Part</button></div>
      {F("notes","Notes")}
      {f.ai&&<div className="rc-card" style={{padding:12,borderColor:"var(--p)",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontFamily:"var(--fd)",fontWeight:700,color:"var(--p)",letterSpacing:2,textTransform:"uppercase",fontSize:13}}>✨ Likely causes</span><button className="rc-bs" onClick={()=>set("ai","")} style={{fontSize:12,padding:"2px 7px"}}>✕</button></div><div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",color:"var(--tx)"}}>{f.ai}</div></div>}
      <div className="rc-fa">{X}{eng&&<button className="rc-bs" disabled={!!f.aiBusy} onClick={suggest} style={{color:"var(--p)",borderColor:"var(--p)"}}>{f.aiBusy?"⏳ Thinking…":"✨ Suggest causes"}</button>}<button className="rc-ba" onClick={()=>{if(!eng||!(sy.length||(f.findings||"").trim()))return;const rec={engineId:eng.id,engineName:eng.name,date:f.date||isoToday(),tech:f.tech||"",symptoms:sy,codes:f.codes||"",findings:f.findings||"",fix:f.fix||"",outcome:f.outcome||"open",hours:+f.hours||0,rate:+f.rate||0,parts:parts.filter(p=>(p.d||"").trim()).map(p=>({d:p.d.trim(),v:+p.v||0})),jobId:f.jobId?+f.jobId:null,issueId:f.issueId?+f.issueId:null,notes:f.notes||""};if(editing){d({type:"UPDATE",list:"diagnoses",id:s.md.id,d:rec});d({type:"MODAL",v:"dx-detail",d:{...s.md,...rec}});}else{d({type:"ADD",list:"diagnoses",d:rec,label:"🩺 Diagnosis logged"});if(s.md&&s.md.back)d({type:"MODAL",v:"part-detail",d:{...eng,ptab:"diagnosis"}});}}}>Save</button></div></div>);}
  if(s.modal==="dx-detail"){const x=(s.diagnoses||[]).find(y=>y.id===s.md.id)||s.md;const eng=engById(s,x.engineId);const is=x.issueId?(s.issues||[]).find(y=>y.id===+x.issueId):null;const job=x.jobId?(s.jobs||[]).find(j=>j.id===+x.jobId):null;const pv=(x.parts||[]).reduce((a,p)=>a+(+p.v||0),0);
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>Diagnosis</div><div style={{fontSize:12,color:"var(--mt)",letterSpacing:1,marginBottom:10}}>{x.date}{x.tech?" · "+x.tech:""}</div>
      {eng&&<div onClick={()=>d({type:"MODAL",v:"part-detail",d:{...eng,ptab:"diagnosis"}})} style={{cursor:"pointer",fontFamily:"var(--fd)",fontWeight:800,fontSize:19,lineHeight:1.05,marginBottom:2}}>{eng.name} <span style={{fontSize:13,color:"var(--mt)",fontWeight:400}}>→ passport</span></div>}{eng&&<div style={{fontSize:13,color:"var(--tx2)",marginBottom:10}}>{eng.sku}{eng.serial||eng.esn?" · ESN "+(eng.serial||eng.esn):""}</div>}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}><Badge s={x.outcome||"open"}/>{(x.symptoms||[]).map(t=>(<span key={t} className="rc-fb on" style={{textTransform:"none",letterSpacing:0,fontSize:12,cursor:"default"}}>{t}</span>))}</div>
      {[["Fault codes",x.codes],["Findings",x.findings],["Fix",x.fix],["Notes",x.notes]].filter(([l,v])=>v).map(([l,v])=>(<div key={l} className="rc-fg"><div className="rc-fl">{l}</div><div style={{fontSize:14,color:"var(--tx)",whiteSpace:"pre-wrap",lineHeight:1.6}}>{v}</div></div>))}
      <div className="rc-3c" style={{marginBottom:12}}><div><div className="rc-ml">Hours</div><div className="rc-mv">{+x.hours||0}h{+x.rate>0&&+x.hours>0?<span style={{fontSize:13,color:"var(--tx2)"}}> · {$$((+x.hours||0)*(+x.rate||0))}</span>:null}</div></div><div><div className="rc-ml">Parts</div><div className="rc-mv">{$$(pv)}</div></div><div><div className="rc-ml">Work order</div><div className="rc-mv" style={{fontSize:14}}>{job?<span style={{cursor:"pointer",color:"var(--act)"}} onClick={()=>d({type:"MODAL",v:"job-detail",d:job})}>{job.service}</span>:"—"}</div></div></div>
      {(x.parts||[]).length>0&&<div style={{background:"var(--sf2)",borderRadius:6,padding:8,marginBottom:10}}>{x.parts.map((p,y)=>(<div key={y} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"2px 0"}}><span>{p.d}</span><span style={{fontWeight:600}}>{$$(+p.v||0)}</span></div>))}</div>}
      {is?<div className="rc-card" style={{padding:10,marginBottom:10,cursor:"pointer"}} onClick={()=>d({type:"MODAL",v:"issue-detail",d:is})}><div className="rc-ml">Linked common issue</div><div style={{fontSize:14,color:"var(--act)"}}>{is.title}</div></div>:null}
      <div className="rc-fa">{C}{!is&&<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"add-issue",d:{prefill:{fromDx:x,models:eng?familyKey(eng):"",symptoms:x.symptoms||[],title:((x.findings||"").split(/[.\n]/)[0]||"").trim().slice(0,90)||(x.symptoms||[]).join(" / "),causes:x.findings||"",fix:x.fix||"",parts:(x.parts||[]).map(p=>p.d).join(", "),severity:"medium"}}})}>📚 Add to common issues</button>}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-dx",d:x})}>✎ Edit</button><button className="rc-bs rc-bsr" onClick={()=>{d({type:"DELETE",list:"diagnoses",id:x.id});d({type:"BACK"});}}>×</button></div></div>);}
  // ── Common issues knowledge base ──
  if(s.modal==="add-issue"||s.modal==="edit-issue"){const editing=s.modal==="edit-issue";const sy=f.symptoms||[];const tog=t=>set("symptoms",sy.includes(t)?sy.filter(x=>x!==t):[...sy,t]);
    return W(<div><div className="rc-mt">{editing?"Edit Common Issue":"Add Common Issue"}</div>
      {F("title","Title — what fails")}
      {F("models","Engine models — comma separated (blank = every engine)")}
      <p style={{fontSize:11,color:"var(--mt)",margin:"-4px 0 8px"}}>Matched against the engine name, so ISX15, DD15, DT466, C7, MP7 all work. Leave blank for a universal triage note.</p>
      <div className="rc-fg"><label className="rc-fl">Symptoms</label>{SYM(sy,tog)}</div>
      <div className="rc-fg"><label className="rc-fl">Severity</label><select className="rc-fi" value={f.severity||"medium"} onChange={e=>set("severity",e.target.value)} style={{appearance:"none"}}>{SEVERITIES.map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</select></div>
      {TA("causes","Root cause — why it happens")}
      {TA("confirm","How to confirm — quickest checks first")}
      {TA("fix","Fix — what it takes")}
      {F("parts","Parts typically needed")}{F("notes","Notes")}
      <div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{if(!(f.title||"").trim())return;const rec={title:f.title.trim(),models:(f.models||"").split(",").map(x=>x.trim()).filter(Boolean),symptoms:sy,severity:f.severity||"medium",causes:f.causes||"",confirm:f.confirm||"",fix:f.fix||"",parts:f.parts||"",notes:f.notes||"",source:editing?(s.md.source||"shop"):"shop"};if(editing){d({type:"UPDATE",list:"issues",id:s.md.id,d:rec});d({type:"MODAL",v:"issue-detail",d:{...s.md,...rec}});}else{const id=Date.now();d({type:"ADD",list:"issues",d:{id,...rec},label:"📚 Added to common issues"});const fd=f.fromDx;if(fd&&fd.id){d({type:"UPDATE",list:"diagnoses",id:fd.id,d:{issueId:id}});d({type:"MODAL",v:"dx-detail",d:{...fd,issueId:id}});}}}}>Save</button></div></div>);}
  if(s.modal==="issue-detail"){const is=(s.issues||[]).find(y=>y.id===s.md.id)||s.md;const seen=(s.diagnoses||[]).filter(x=>+x.issueId===is.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));const fits=(s.inventory||[]).filter(isEngine).filter(e=>engStatus(e)!=="sold"&&issueFits(is,e));
    return W(<div><div className="rc-mt" style={{marginBottom:4}}>Common Issue</div><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}><Badge s={is.severity||"medium"}/><Badge s={is.source||"shop"}/></div>
      <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:20,lineHeight:1.1,marginBottom:6}}>{is.title}</div>
      <div style={{fontSize:13,color:"var(--tx2)",marginBottom:8}}>Applies to: <span style={{color:"var(--act)"}}>{(is.models||[]).length?is.models.map(famLabel).join(", "):"every engine"}</span></div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{(is.symptoms||[]).map(t=>(<span key={t} className="rc-fb on" style={{textTransform:"none",letterSpacing:0,fontSize:12,cursor:"default"}}>{t}</span>))}</div>
      {[["Why it happens",is.causes],["How to confirm",is.confirm],["Fix",is.fix],["Parts",is.parts],["Notes",is.notes]].filter(([l,v])=>v).map(([l,v])=>(<div key={l} className="rc-fg"><div className="rc-fl">{l}</div><div style={{fontSize:14,color:"var(--tx)",whiteSpace:"pre-wrap",lineHeight:1.6}}>{v}</div></div>))}
      {fits.length>0&&<div className="rc-fg"><div className="rc-fl">On the lot right now ({fits.length})</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{fits.slice(0,8).map(e=>(<button key={e.id} className="rc-fb" onClick={()=>d({type:"MODAL",v:"part-detail",d:{...e,ptab:"diagnosis"}})} style={{textTransform:"none",letterSpacing:0,fontSize:12}}>{e.sku||e.name}</button>))}{fits.length>8&&<span style={{fontSize:12,color:"var(--mt)",alignSelf:"center"}}>+{fits.length-8}</span>}</div></div>}
      {seen.length>0&&<div className="rc-fg"><div className="rc-fl">Seen in this shop ({seen.length})</div>{seen.slice(0,6).map(x=>{const e=engById(s,x.engineId);return(<div key={x.id} onClick={()=>d({type:"MODAL",v:"dx-detail",d:x})} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid var(--ln2)",fontSize:13,cursor:"pointer",alignItems:"center"}}><span style={{color:"var(--mt)",fontSize:11,width:66,flexShrink:0}}>{x.date}</span><span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e?e.name:"—"}{x.fix?<span style={{color:"var(--tx2)"}}> → {x.fix}</span>:""}</span><Badge s={x.outcome||"open"}/></div>);})}</div>}
      <div className="rc-fa">{C}<button className="rc-bs" onClick={()=>d({type:"MODAL",v:"edit-issue",d:is})}>✎ Edit</button><button className="rc-bs rc-bsr" onClick={()=>{d({type:"DELETE",list:"issues",id:is.id});d({type:"BACK"});}}>×</button></div></div>);}
  if(s.modal==="export-engine"){const i=s.md;const txt=f.exportText!==undefined?f.exportText:listingText(i);
    const copy=(t,label)=>{try{navigator.clipboard.writeText(t);d({type:"TOAST",d:{msg:"📋 "+label+" copied — paste into your website",t:Date.now()}});}catch(e){d({type:"TOAST",d:{msg:"⚠ Copy failed — select the text and copy manually",t:Date.now()}});}};
    return W(<div><div className="rc-mt">Export for Website — {i.sku||i.name}</div>
      <p style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>Main details, price, and photo only — costs, parts, and margins are never included. Edit the text below before copying if you like.</p>
      {i.photo&&<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><img src={i.photo} alt="" style={{width:84,height:64,objectFit:"cover",borderRadius:6,border:"1px solid var(--ln)"}}/><button className="rc-bs" onClick={()=>downloadPhoto(i.photo,(i.sku||"engine")+".jpg")}>⬇ Download photo ({(i.sku||"engine")+".jpg"})</button></div>}
      <textarea className="rc-fi" rows={11} value={txt} onChange={e=>set("exportText",e.target.value)} style={{resize:"vertical",lineHeight:1.5,fontSize:13}}/>
      <div className="rc-fa">{C}<button className="rc-bs" onClick={()=>copy(listingHtml(i),"HTML")}>Copy as HTML</button><button className="rc-ba" onClick={()=>copy(txt,"Listing")}>📋 Copy text</button></div></div>);}
  if(s.modal==="shop-log"){const acts=s.activity||[];const groups=[];let cur=null;acts.forEach(x=>{const day=(x.ts||"").slice(0,10);if(!cur||cur.day!==day){cur={day,items:[]};groups.push(cur);}cur.items.push(x);});return W(<div><div className="rc-mt">Shop Log</div><p style={{fontSize:12,color:"var(--mt)",marginBottom:12}}>Recorded automatically as the crew works — status moves, time logged, photos, invoices, adds and deletes, with who did it. Keeps the last 400 events.</p>{acts.length===0?(<div style={{fontSize:14,color:"var(--mt)",padding:"10px 0"}}>Nothing recorded yet. Move a card on the Reman Board or log time on a job and it'll show up here.</div>):groups.map(g=>(<div key={g.day} style={{marginBottom:12}}><div className="rc-fl" style={{marginBottom:4,color:"var(--act)"}}>{g.day===isoToday()?"Today · "+g.day:g.day}</div>{g.items.map(x=>(<div key={x.id} className="rc-act"><span className="rc-act-t">{(x.ts||"").slice(11,16)}</span><span className="rc-act-u">{x.user}</span><span style={{flex:1,minWidth:0}}>{x.msg}</span></div>))}</div>))}<div className="rc-fa">{C}</div></div>);}
  if(s.modal==="set-goal"){const cur=(s.settings||[])[0];return W(<div><div className="rc-mt">Monthly Goal</div><div className="rc-fg"><label className="rc-fl">Revenue target ($ / month)</label><input className="rc-fi" type="number" placeholder={String((cur&&cur.monthlyGoal)||50000)} value={f.monthlyGoal||""} onChange={e=>set("monthlyGoal",e.target.value)}/></div><p style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>Drives the goal bar on Overview. Beating a previous month's total triggers the Best Month banner.</p><div className="rc-fa">{X}<button className="rc-ba" onClick={()=>{const v=+f.monthlyGoal||0;if(!v)return;if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:{monthlyGoal:v}});else d({type:"ADD",list:"settings",d:{monthlyGoal:v},label:"Goal saved"});d({type:"CLOSE"});}}>Save</button></div></div>);}
  // ── Timesheets: one day (the employee's own, or the owner fixing anyone's) ──
  if(s.modal==="ts-day"&&s.md){const{emp,date,name}=s.md;const today=Tsh.shopToday();const prev=(s.timesheets||[]).find(r=>r.id===Tsh.entryId(emp,date));const lk=Tsh.lockedBy(s.payPeriods,emp,date);const role=(who&&who.role)||"staff";const acc=Tsh.dayAccess({date,today,locked:!!lk,role});
    const val=(k,p)=>f[k]!==undefined?f[k]:p;
    const st=val("tsS",prev?Tsh.toTimeInput(prev.start):""),fi=val("tsF",prev?Tsh.toTimeInput(prev.finish):""),no=val("tsN",prev?prev.notes||"":"");
    const chk=Tsh.checkTimes(Tsh.fromTimeInput(st),Tsh.fromTimeInput(fi));const empty=!st&&!fi&&!String(no).trim();
    // The owner clearing today's fresh entry just removes it (undo from the toast). Everything else, and anything an employee
    // clears, is saved empty, so the history stays and the owner still sees what it said (employees can't delete, 0013).
    const clear=()=>{if(!acc.can||!prev)return;if(role!=="employee"&&date===today&&!Tsh.wasEdited(prev))d({type:"DELETE",list:"timesheets",id:prev.id});else tsSave(s,d,{emp,date,vals:{start:"",finish:"",notes:""},label:"Cleared "+Tsh.shortDate(date)+". The old times stay in the day's history."});d({type:"CLOSE"});};
    const save=()=>{if(!acc.can||!chk.ok||empty)return;tsSave(s,d,{emp,date,vals:{start:Tsh.fromTimeInput(st),finish:Tsh.fromTimeInput(fi),notes:String(no).trim()},label:"Saved "+Tsh.shortDate(date)+(chk.min?": "+fH(chk.min)+" h":"")});d({type:"CLOSE"});};
    return W(<div>
      <div className="rc-mt">{Tsh.longDate(date)}</div>
      {name&&role!=="employee"&&<div className="rc-ts-dim" style={{marginTop:-8,marginBottom:12}}>{name}</div>}
      {!acc.can?<div className="rc-ts-note">{acc.why==="future"?"This day hasn't happened yet, so it can't be filled in.":acc.why==="locked"?"This pay period is approved, so the day is locked. Ask the owner if something's wrong.":acc.why==="old"?"This day is too far back to change here. Ask the owner if something's wrong.":"Only the owner and the employee can change hours."}</div>:(<>
        {acc.why==="locked"&&<div className="rc-ts-lockwarn">This day is in an approved pay period. Your change is kept in the day's history.</div>}
        {Tsh.isWeekday(date)&&<button className="rc-bs rc-ts-fullbtn" onClick={()=>sf(pp=>({...pp,tsS:"08:00",tsF:"16:00"}))}>Full day · 8:00 AM to 4:00 PM</button>}
        <div className="rc-ts-times"><div className="rc-fg"><label className="rc-fl" htmlFor="ts-start">Start</label><input id="ts-start" className="rc-fi" type="time" step="300" value={st} onChange={ev=>set("tsS",ev.target.value)}/></div><div className="rc-fg"><label className="rc-fl" htmlFor="ts-finish">Finish</label><input id="ts-finish" className="rc-fi" type="time" step="300" value={fi} onChange={ev=>set("tsF",ev.target.value)}/></div></div>
        <div className="rc-ts-live" aria-live="polite">{!chk.ok?<span className="rc-ts-errl">{chk.msg}</span>:chk.min?<b>{fH(chk.min)} h{chk.min>Tsh.DAY_MIN?" · "+fH(chk.min-Tsh.DAY_MIN)+" over 8":""}</b>:null}{chk.warn&&<div className="rc-ts-warnl">{chk.warn}</div>}</div>
        <div className="rc-fg"><label className="rc-fl" htmlFor="ts-notes">Notes</label><input id="ts-notes" className="rc-fi" value={no} onChange={ev=>set("tsN",ev.target.value)} placeholder="Job or unit worked on, or sick / stat / vacation"/><div className="rc-ts-chips">{["Sick","Vacation","Stat holiday","Day off"].map(c=>(<button key={c} type="button" className="rc-fb" onClick={()=>set("tsN",c)}>{c}</button>))}</div></div>
        <div className="rc-fa">{Tsh.isFilled(prev)&&<button className="rc-bs rc-bsr" onClick={clear}>Clear day</button>}{X}<button className="rc-ba" disabled={!chk.ok||empty} onClick={save}>Save</button></div>
      </>)}
      {role!=="employee"&&<TsHistory r={prev}/>}
      {!acc.can&&<div className="rc-fa">{C}</div>}
    </div>);}
  // ── Team: a login for a team member (owner, cloud) ──
  if(s.modal==="emp-login"&&s.md){const e=s.md.emp;const L=loginFor(logins,e);const busy=!!f.lgBusy;
    // A login that already exists (made in Supabase before, or for office staff) can be linked instead of created.
    const all=(logins&&logins.list)||[];const typed=String(f.lgEmail||"").trim().toLowerCase();const ex=typed?all.find(l=>String(l.email||"").toLowerCase()===typed)||null:null;const loose=all.filter(l=>l.role!=="owner"&&l.employeeId==null);const canLink=!!ex&&ex.role!=="owner"&&ex.employeeId==null;
    const run=async(fn,after)=>{if(busy)return;sf(pp=>({...pp,lgBusy:true,lgErr:"",lgMsg:null}));let r=null;try{r=await fn();}finally{sf(pp=>({...pp,lgBusy:false}));}if(!r||r.error){sf(pp=>({...pp,lgErr:(r&&r.error)||"Something went wrong."}));return;}await refreshLogins();if(after)after(r);};
    const copy=t=>{try{navigator.clipboard.writeText(t);d({type:"TOAST",d:{msg:"Copied",t:Date.now()}});}catch(err){}};
    const site=typeof window!=="undefined"?window.location.origin:"";
    const card=(email,pw)=>(<div className="rc-ts-cred"><div><span>Website</span><b>{site}</b></div><div><span>Email</span><b>{email}</b></div><div><span>Password</span><b>{pw}</b></div><button className="rc-bs" onClick={()=>copy("Rollin Coal timesheet\n"+site+"\nEmail: "+email+"\nPassword: "+pw)}>Copy</button></div>);
    if(!canManageLogins)return W(<div><div className="rc-mt">Login for {e.name}</div><p className="rc-ts-note">Logins need the cloud setup (SETUP.md). In this copy, use “See {firstName(e.name)}'s screen” under Team, Timesheets to try what an employee sees.</p><div className="rc-fa">{C}</div></div>);
    return W(<div>
      <div className="rc-mt">Login for {e.name}</div>
      {f.lgMsg&&<div className="rc-ts-okbox"><b>{f.lgMsg.title}</b>{f.lgMsg.pw?<><p>Give these to {firstName(e.name)}. They can change the password after signing in.</p>{card(f.lgMsg.email,f.lgMsg.pw)}</>:<p>{firstName(e.name)} signs in with the password they already have. If they need a new one, use New password below.</p>}</div>}
      {f.lgErr&&<div className="rc-ts-errl" role="alert">{f.lgErr}</div>}
      {!L?(f.lgMsg?<div className="rc-fa">{C}</div>:<>
        <p className="rc-ts-note">With a login, {firstName(e.name)} signs in on a phone or computer and fills in their own hours. They won't see anything else in the dashboard.</p>
        <div className="rc-fg"><label className="rc-fl" htmlFor="lg-email">Email</label><input id="lg-email" className="rc-fi" type="email" autoComplete="off" value={f.lgEmail||""} onChange={ev=>set("lgEmail",ev.target.value)} placeholder="name@example.com"/></div>
        {loose.length>0&&<div className="rc-ts-chips rc-ts-loose"><span className="rc-ts-dim">Already has a login? Tap it to link it:</span>{loose.map(l=>(<button key={l.id} type="button" className={"rc-fb"+(typed===String(l.email||"").toLowerCase()?" on":"")} onClick={()=>set("lgEmail",l.email)}>{l.email}</button>))}</div>}
        {ex&&ex.role==="owner"&&<div className="rc-ts-note">That's an owner login. It already sees everything.</div>}
        {ex&&ex.role!=="owner"&&ex.employeeId!=null&&<div className="rc-ts-note">That login belongs to {ex.name||"another team member"}.</div>}
        {!ex&&<div className="rc-fg"><label className="rc-fl" htmlFor="lg-pass">Temporary password</label><div style={{display:"flex",gap:8}}><input id="lg-pass" className="rc-fi" autoComplete="off" value={f.lgPass||""} onChange={ev=>set("lgPass",ev.target.value)}/><button className="rc-bs" onClick={()=>set("lgPass",makePassword())}>New</button></div></div>}
        <div className="rc-fg"><span className="rc-fl">Access</span><div className="rc-ts-radio"><label><input type="radio" name="lg-role" checked={(f.lgRole||"employee")==="employee"} onChange={()=>set("lgRole","employee")}/> Employee: their own timesheet only</label><label><input type="radio" name="lg-role" checked={f.lgRole==="staff"} onChange={()=>set("lgRole","staff")}/> Office staff: the whole dashboard, no wages</label></div></div>
        <div className="rc-fa">{X}{canLink?<button className="rc-ba" disabled={busy} onClick={()=>run(()=>setLoginAccess(ex.id,f.lgRole||"employee",e.id),()=>sf(pp=>({...pp,lgMsg:{title:"Login linked",email:ex.email,pw:null}})))}>{busy?"Linking…":"Link this login"}</button>:<button className="rc-ba" disabled={busy||!f.lgEmail||!!ex||String(f.lgPass||"").length<8} onClick={()=>run(()=>createLogin({employeeId:e.id,email:f.lgEmail,password:f.lgPass,role:f.lgRole||"employee"}),r=>sf(pp=>({...pp,lgMsg:{title:"Login created",email:r.login.email,pw:pp.lgPass}})))}>{busy?"Creating…":"Create login"}</button>}</div>
      </>):(<>
        <div className="rc-ts-login"><div><span className="rc-fl">Email</span><b>{L.email}</b></div><div><span className="rc-fl">Access</span><b>{L.role==="employee"?"Employee: own timesheet only":"Office staff: the whole dashboard"}</b></div><div><span className="rc-fl">Last signed in</span><b>{L.lastSignIn?fmtWhen(L.lastSignIn):"Never"}</b></div></div>
        <div className="rc-fa" style={{justifyContent:"flex-start",flexWrap:"wrap"}}>
          <button className="rc-bs" disabled={busy} onClick={()=>{const pw=makePassword();run(()=>setLoginPassword(L.id,pw),()=>sf(pp=>({...pp,lgMsg:{title:"New password set",email:L.email,pw}})));}}>New password</button>
          <button className="rc-bs" disabled={busy} onClick={()=>run(()=>setLoginAccess(L.id,L.role==="employee"?"staff":"employee",e.id))}>{L.role==="employee"?"Make it office staff":"Make it timesheet only"}</button>
          <button className="rc-bs rc-bsr" disabled={busy} onClick={()=>{if(!f.lgSure){set("lgSure",true);return;}run(()=>removeLogin(L.id),()=>sf(pp=>({...pp,lgSure:false})));}}>{f.lgSure?"Tap again to remove":"Remove login"}</button>
        </div>
        <div className="rc-fa">{C}</div>
      </>)}
    </div>);}
  // ── Timesheets: pay period and overtime rate (owner) ──
  if(s.modal==="ts-settings"){const st=tsSet(s);const ot=tsOtRate(s);const saveSet=patch=>{const cur=(s.settings||[])[0];if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:patch});else d({type:"ADD",list:"settings",d:patch,keep:true,label:"Saved"});};
    return W(<div><div className="rc-mt">Timesheet settings</div>
      <div className="rc-fg"><label className="rc-fl" htmlFor="ts-kind">Pay period</label><select id="ts-kind" className="rc-fi" value={st.kind} onChange={ev=>saveSet({payPeriod:ev.target.value})} style={{appearance:"none"}}><option value="monthly">Monthly</option><option value="semimonthly">Twice a month (1st to 15th, 16th to month end)</option><option value="biweekly">Every two weeks</option></select></div>
      {st.kind==="biweekly"&&<div className="rc-fg"><label className="rc-fl" htmlFor="ts-anchor">First day of any pay period</label><input id="ts-anchor" className="rc-fi" type="date" value={st.anchor||""} onChange={ev=>saveSet({payAnchor:ev.target.value})}/></div>}
      <div className="rc-fg"><label className="rc-fl" htmlFor="ts-ot">Overtime pay</label><select id="ts-ot" className="rc-fi" value={String(ot)} onChange={ev=>saveSet({otRate:+ev.target.value})} style={{appearance:"none"}}><option value="1.5">1.5 × the pay rate (Alberta's minimum)</option><option value="2">2 × the pay rate</option></select></div>
      <p className="rc-ts-note">A full day is 8:00 AM to 4:00 PM, Monday to Friday, with lunch paid. Pay rates are each person's Rate on the Team tab.</p>
      <div className="rc-fa">{C}</div></div>);}
  // ── Any signed-in login: a new password ──
  if(s.modal==="my-password"){const ok=String(f.pw1||"").length>=8&&f.pw1===f.pw2;
    return W(<div><div className="rc-mt">Change your password</div>
      <div className="rc-fg"><label className="rc-fl" htmlFor="pw1">New password</label><input id="pw1" className="rc-fi" type="password" autoComplete="new-password" value={f.pw1||""} onChange={ev=>set("pw1",ev.target.value)}/></div>
      <div className="rc-fg"><label className="rc-fl" htmlFor="pw2">Type it again</label><input id="pw2" className="rc-fi" type="password" autoComplete="new-password" value={f.pw2||""} onChange={ev=>set("pw2",ev.target.value)}/></div>
      <div className="rc-ts-dim">At least 8 characters.{f.pw2&&f.pw1!==f.pw2?" The two don't match yet.":""}</div>
      {f.pwErr&&<div className="rc-ts-errl" role="alert">{f.pwErr}</div>}
      <div className="rc-fa">{X}<button className="rc-ba" disabled={!ok||f.pwBusy} onClick={async()=>{set("pwBusy",true);const err=await changePassword(f.pw1);set("pwBusy",false);if(err){set("pwErr",err);return;}d({type:"CLOSE"});d({type:"TOAST",d:{msg:"Password changed",t:Date.now()}});}}>Save</button></div></div>);}
  if(s.modal==="confirm-reset"&&!usingCloud)return W(<div><div className="rc-mt">Reset All Data?</div><p style={{fontSize:14,color:"var(--tx2)",marginBottom:10,lineHeight:1.6}}>This permanently deletes <strong>everything</strong> — engines, customers, invoices, wins, the lot. Download a backup first.</p><button className="rc-bs" style={{marginBottom:12}} onClick={()=>exportBackup(s)}>⬇ Download backup (JSON)</button><div className="rc-fg"><label className="rc-fl">Type RESET to confirm</label><input className="rc-fi" value={f.resetConfirm||""} onChange={e=>set("resetConfirm",e.target.value)} placeholder="RESET"/></div><div className="rc-fa">{C}<button className="rc-ba" disabled={(f.resetConfirm||"")!=="RESET"} style={{background:(f.resetConfirm||"")==="RESET"?"var(--r)":"var(--rs)",borderColor:"var(--r)",opacity:(f.resetConfirm||"")==="RESET"?1:.5,cursor:(f.resetConfirm||"")==="RESET"?"pointer":"not-allowed"}} onClick={async()=>{if((f.resetConfirm||"")!=="RESET")return;await clearAll();d({type:"RESET"});d({type:"CLOSE"});}}>Reset</button></div></div>);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════
const CSS=`@import url('${FONTS}');
.rc-root{--bg:#f3f2ef;--sf:#ffffff;--sf2:#f6f4f1;--in:#ffffff;--ln:#e2ded7;--ln2:#eeebe6;--tx:#1c1b19;--tx2:#48443d;--mt:#6d685f;--ft:#a19b91;--ac:#d4581a;--act:#b44810;--acs:#fbede4;--ach:#bf4c13;--acb:#c24e14;--acbh:#a94310;--g:#2e7d4a;--gs:#e4f2e9;--w:#95600f;--ws:#fbf0d9;--r:#b8321f;--rs:#fbe4e0;--b:#2d6aa6;--bs:#e3edf8;--p:#7a4fb5;--ps:#f1e9fa;--sh1:0 1px 2px rgba(28,25,20,.05);--sh2:0 12px 32px -16px rgba(28,25,20,.28);--ov:rgba(28,27,25,.42);--grad:linear-gradient(135deg,#e26a2c,#d4581a);--fd:'Barlow Condensed','Arial Narrow',sans-serif;--fb:'Public Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color-scheme:light;font-family:var(--fb);font-size:14px;line-height:1.5;color:var(--tx);background:var(--bg);min-height:100vh;-webkit-font-smoothing:antialiased;}
.rc-root[data-theme="night"]{--bg:#121314;--sf:#1a1c1f;--sf2:#212428;--in:#15171a;--ln:#2d3136;--ln2:#25282c;--tx:#ecebe7;--tx2:#c8c4bc;--mt:#9a958c;--ft:#6e6961;--ac:#e2682a;--act:#ff9058;--acs:rgba(226,104,42,.16);--ach:#ef7836;--acb:#c24e14;--acbh:#d4581a;--g:#4cc38a;--gs:rgba(76,195,138,.14);--w:#e2b24c;--ws:rgba(226,178,76,.14);--r:#f06b58;--rs:rgba(240,107,88,.15);--b:#6ea9ea;--bs:rgba(110,169,234,.15);--p:#b28ceb;--ps:rgba(178,140,235,.15);--sh1:0 1px 2px rgba(0,0,0,.35);--sh2:0 16px 40px -18px rgba(0,0,0,.85);--ov:rgba(0,0,0,.62);--grad:linear-gradient(135deg,#f07a3a,#e2682a);color-scheme:dark;}
*{margin:0;padding:0;box-sizing:border-box;}
.rc-root button,.rc-root input,.rc-root select,.rc-root textarea{font-family:inherit;}
.rc-root button:focus-visible,.rc-root a:focus-visible{outline:2px solid var(--ac);outline-offset:2px;}
.rc-root select option{background:var(--sf);color:var(--tx);}
.rc-ico{width:18px;height:18px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
.rc-shell{display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100vh;}
.rc-side{position:sticky;top:0;height:100vh;height:100dvh;overflow:hidden;background:var(--sf);border-right:1px solid var(--ln);display:flex;flex-direction:column;padding:18px 14px 14px;z-index:60;}
.rc-logo{display:flex;align-items:center;gap:10px;padding:2px 6px 16px;}
.rc-hi{width:38px;height:38px;border-radius:10px;background:var(--ac);color:#fff;display:grid;place-items:center;font:800 18px/1 var(--fd);letter-spacing:-.5px;flex-shrink:0;}
.rc-hn{font:800 20px/1 var(--fd);letter-spacing:1px;text-transform:uppercase;color:var(--tx);white-space:nowrap;}
.rc-hs{font-size:11px;font-weight:500;color:var(--mt);margin-top:4px;white-space:nowrap;}
.rc-navlist{display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-height:0;overflow-y:auto;margin:0 -6px;padding:0 6px;}
.rc-nsec{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mt);padding:16px 10px 5px;}
.rc-ni{display:flex;align-items:center;gap:11px;width:100%;padding:8px 10px;border:0;border-radius:9px;background:none;color:var(--tx2);font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:background .12s,color .12s;}
.rc-ni:hover{background:var(--sf2);color:var(--tx);}
.rc-ni.on{background:var(--acs);color:var(--act);font-weight:650;}
.rc-sfoot{flex:none;margin-top:auto;padding-top:14px;border-top:1px solid var(--ln);display:flex;flex-direction:column;gap:10px;}
.rc-seg{display:grid;grid-template-columns:repeat(3,1fr);background:var(--sf2);border:1px solid var(--ln);border-radius:10px;padding:3px;gap:2px;}
.rc-seg button{border:0;background:none;border-radius:7px;padding:6px 0;font-size:12.5px;font-weight:600;color:var(--mt);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;}
.rc-seg button.on{background:var(--sf);color:var(--tx);box-shadow:var(--sh1);}
.rc-seg.two{grid-template-columns:repeat(2,1fr);}
.rc-ov.rc-wmod .rc-mod{max-width:880px;}
.rc-ecm-sec{font-size:12.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mt);margin:18px 0 8px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;}
.rc-ecm-sec span{font-weight:400;letter-spacing:0;text-transform:none;color:var(--ft);}
.rc-ecm-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 10px;}
.rc-ecm-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px;}
.rc-ecm-ft{display:grid;grid-template-columns:130px minmax(0,1fr) 70px 150px auto 34px;gap:6px;margin-bottom:6px;align-items:center;}
.rc-ecm-pr{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) 34px;gap:6px;margin-bottom:6px;align-items:center;}
.rc-ecm-ph{font-size:11.5px;font-weight:650;letter-spacing:.7px;text-transform:uppercase;color:var(--mt);margin-bottom:4px;}
.rc-ecm-ban{border-radius:10px;padding:10px 12px;font-size:13.5px;margin-bottom:10px;line-height:1.5;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.rc-ecm-ban.bad{background:var(--rs);color:var(--r);border:1px solid color-mix(in srgb,var(--r) 35%,transparent);font-weight:600;}
.rc-ecm-ban.warn{background:var(--ws);color:var(--tx);border:1px solid color-mix(in srgb,var(--w) 40%,transparent);}
.rc-ecm-ban.info{background:var(--bs);color:var(--tx);border:1px solid color-mix(in srgb,var(--b) 30%,transparent);}
.rc-ecm-em{border:1px solid var(--ln);border-radius:20px;padding:3px 10px;color:var(--tx2);}
.rc-ecm-rh{font-size:13px;color:var(--mt);margin:0 2px 8px;line-height:1.5;}
@media(max-width:700px){.rc-ecm-g{grid-template-columns:repeat(2,minmax(0,1fr));}.rc-ecm-ft,.rc-ecm-pr{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}.rc-ecm-ph{display:none;}}
.rc-tbl.rc-tbl-wrap th{white-space:normal;vertical-align:bottom;}.rc-tbl.rc-tbl-wrap th,.rc-tbl.rc-tbl-wrap td{padding-left:10px;padding-right:10px;}
.rc-seg.four{grid-template-columns:repeat(4,1fr);}
.rc-seg.four button{padding:8px 4px;font-size:13.5px;}
.rc-pipe{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-bottom:18px;}
.rc-pipe-i{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;background:var(--sf);border:1px solid var(--ln);border-left:4px solid var(--pc);border-radius:10px;padding:9px 11px;cursor:pointer;box-shadow:var(--sh1);color:var(--tx);font-family:var(--fb);}
.rc-pipe-i .n{font:700 23px/1.1 var(--fd);font-variant-numeric:tabular-nums;}
.rc-pipe-i .l{font-size:12.5px;color:var(--mt);font-weight:600;}
.rc-pipe-i.on{box-shadow:0 0 0 2px var(--pc);}
.rc-pri{display:inline-flex;min-width:26px;height:26px;padding:0 4px;border-radius:7px;align-items:center;justify-content:center;font:700 14px var(--fd);border:1.5px solid var(--ln2);color:var(--tx2);}
.rc-pri.pA{border-color:var(--ac);color:var(--act);background:var(--acs);}
.rc-pri.pB{border-color:var(--b);color:var(--b);}
.rc-pitch{border:1px solid color-mix(in srgb,var(--ac) 45%,transparent);background:var(--acs);border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:15px;line-height:1.5;color:var(--tx);}
.rc-contact{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.rc-contact a{text-decoration:none;}
.rc-kv{margin-bottom:12px;}
.rc-pi-add{display:grid;grid-template-columns:140px minmax(0,1.4fr) 110px minmax(0,1fr) auto;gap:6px;padding:8px 0;align-items:center;}
.rc-fu-row{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--ln2);flex-wrap:wrap;font-size:14px;}
.rc-lnk{background:none;border:0;padding:0;font:600 14.5px var(--fb);color:var(--tx);cursor:pointer;text-align:left;}
.rc-lnk:hover{color:var(--act);text-decoration:underline;}
.rc-lnk.rc-tn{font-size:14px;}
.rc-lnk:focus-visible,.rc-lrec:focus-visible{outline:2px solid var(--ac);outline-offset:2px;}
.rc-lrec{width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;}
.rc-lrec:hover:not(:disabled){border-color:var(--ac);}
.rc-lrec:disabled{cursor:default;}
.rc-eng-ph{width:92px;padding:4px 6px!important;}
.rc-eng-img{width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--ln);cursor:pointer;display:block;}
.rc-eng-img.none{border-style:dashed;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--ft);}
.rc-sm-only{display:none;}
.rc-s3-stage.m2d{background:var(--sf2);}.rc-map2d{width:100%;height:100%;display:block;font-family:var(--fb);touch-action:manipulation;}
.rc-map2d .m-lot{fill:var(--sf);stroke:var(--ln);stroke-width:.3px;}.rc-map2d .m-bldg{fill:none;stroke:var(--tx2);stroke-width:.55px;pointer-events:none;}
.rc-map2d .m-area{cursor:pointer;outline:none;}.rc-map2d .m-area rect{stroke-width:.25px;}.rc-map2d .m-area:hover rect{stroke-width:.5px;}.rc-map2d .m-area.on rect,.rc-map2d .m-area:focus-visible rect{stroke:var(--ac)!important;stroke-width:.6px;}
.rc-map2d .m-slot{fill:none;stroke:var(--mt);stroke-width:.12px;stroke-dasharray:.5 .4;pointer-events:none;}
.rc-map2d .m-eng{cursor:pointer;outline:none;}.rc-map2d .m-eng rect{stroke-width:.22px;}.rc-map2d .m-eng:hover rect{stroke-width:.45px;}.rc-map2d .m-eng.on rect,.rc-map2d .m-eng:focus-visible rect{stroke:var(--ac)!important;stroke-width:.6px;}
.rc-map2d text{pointer-events:none;}.rc-map2d .m-et{font-size:1.05px;font-weight:700;fill:var(--tx);text-anchor:middle;}
.rc-map2d .m-at{font-size:1.75px;font-weight:700;fill:var(--tx);paint-order:stroke;stroke:var(--sf);stroke-width:.4px;}.rc-map2d .m-ac{font-size:1.3px;fill:var(--tx2);paint-order:stroke;stroke:var(--sf);stroke-width:.35px;}
.rc-map2d .m-dim line,.rc-map2d .m-scale line{stroke:var(--act);stroke-width:.18px;}.rc-map2d .m-dim text{font-size:1.5px;font-weight:700;fill:var(--act);text-anchor:middle;}.rc-map2d .m-scale text{font-size:1.3px;fill:var(--tx2);}.rc-map2d .m-street{font-size:1.6px;font-weight:700;letter-spacing:.4px;fill:var(--mt);text-anchor:middle;}.rc-map2d.dragging .m-slot{stroke:var(--act);stroke-width:.22px;pointer-events:all;cursor:pointer;}.rc-map2d .m-slot.drop,.rc-map2d .m-eng.drop rect{stroke:var(--ac)!important;stroke-width:.7px;fill:var(--acs);}.rc-map2d .m-eng{touch-action:none;}.rc-map2d .m-eng.lifted{opacity:.35;}.rc-map2d .m-ghost{pointer-events:none;opacity:.9;}.rc-s3-movebar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;background:var(--sf);border:1px solid var(--ac);border-radius:10px;padding:8px 10px 8px 14px;font-size:13.5px;box-shadow:var(--sh2);max-width:calc(100% - 24px);}.rc-map2d .m-north{font-size:1.6px;font-weight:700;fill:var(--tx2);text-anchor:end;}
.rc-s3-zoomed{font-size:13px;color:var(--tx2);align-self:center;}
.rc-eparts{margin-bottom:12px;padding:12px;display:grid;gap:10px;}.rc-eparts-none,.rc-eparts-src{font-size:13px;color:var(--mt);line-height:1.5;}.rc-eparts-h{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--tx2);margin-bottom:4px;}
.rc-eparts-r{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:14px;padding:3px 0;border-bottom:1px solid var(--ln2);}.rc-eparts-r small{font-size:12.5px;color:var(--mt);}
.rc-qr-p{font-size:14px;color:var(--tx2);line-height:1.5;margin:0 0 12px;}.rc-qr-one{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px;}.rc-qr-img{width:150px;height:150px;flex:none;background:#fff;padding:8px;border-radius:8px;border:1px solid var(--ln);}.rc-qr-img svg{width:100%;height:100%;display:block;}
.rc-qr-url{font-size:12px;color:var(--mt);word-break:break-all;margin-top:6px;}.rc-qr-bar{display:flex;gap:12px;align-items:center;font-size:13.5px;color:var(--tx2);margin-bottom:6px;}
.rc-qr-list{max-height:300px;overflow:auto;border:1px solid var(--ln);border-radius:8px;}.rc-qr-row{display:flex;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--ln2);font-size:14px;cursor:pointer;}.rc-qr-row b{min-width:64px;}.rc-qr-row span{color:var(--tx2);}
.rc-sku-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--ln2);font-size:13.5px;font-variant-numeric:tabular-nums;}.rc-sku-row .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.rc-sku-row .old{color:var(--mt);text-decoration:line-through;}.rc-sku-row .arr{color:var(--mt);}.rc-sku-auto{display:flex;flex-direction:column;gap:3px;padding:9px 12px;border:1px dashed var(--ln);border-radius:8px;background:var(--sf2);}.rc-sku-auto b{font-size:16px;font-variant-numeric:tabular-nums;letter-spacing:.3px;}.rc-sku-auto span{font-size:13px;color:var(--mt);line-height:1.45;}.rc-sku-use{display:inline-block;margin:-4px 0 10px;font-size:13.5px;}@media(max-width:600px){.rc-sku-row{grid-template-columns:minmax(0,1fr) auto;}.rc-sku-row .nm{grid-column:1/-1;}.rc-sku-row .arr{display:none;}}.rc-qr-note{font-size:12.5px;color:var(--mt);margin:10px 0 0;line-height:1.5;}
.rc-badge{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:var(--fb);}.rc-bdot{width:6px;height:6px;border-radius:50%;flex:none;}
.rc-clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;}
.rc-bmv{flex:1;min-height:36px;padding:4px 0!important;font-size:15px!important;}
.rc-bmv:disabled{opacity:.3!important;}
.rc-mod:focus{outline:none;}
.rc-mod>div>.rc-fa{position:sticky;bottom:-22px;z-index:2;margin:18px -22px -22px;padding:12px 22px;background:var(--sf);border-top:1px solid var(--ln2);}
@media(max-width:600px){.rc-tbl td,.rc-tbl th{padding-left:10px;padding-right:10px;}.rc-tbl.rc-fit{min-width:0;}.rc-badge{letter-spacing:.4px;padding:3px 8px;gap:4px;}.rc-clip{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-width:none;}.rc-sm-hide{display:none!important;}.rc-sm-only{display:block;}.rc-eng-ph{width:56px;}.rc-eng-img{width:48px;height:48px;}.rc-eng-img.none{font-size:18px;}}
.rc-cmp td{min-width:130px;max-width:280px;vertical-align:top;font-size:13px;line-height:1.45;}
.rc-cmp td.stick,.rc-cmp th.stick{position:sticky;left:0;z-index:2;min-width:180px;}
.rc-cmp td.stick{background:var(--sf);font-weight:600;box-shadow:1px 0 0 var(--ln);}
.rc-cmp th.stick{background:var(--sf2);}
.rc-cmp tr.us td,.rc-tbl.rc-cmp tbody tr.us:hover td{background:var(--acs);font-weight:600;}
.rc-cmp tr.us td.stick,.rc-tbl.rc-cmp tbody tr.us:hover td.stick{background:linear-gradient(var(--acs),var(--acs)),var(--sf);}
.rc-cmp td.win{color:var(--g);}
.rc-cmp td.lose{color:var(--r);}
.rc-cmp td.ed{cursor:text;}
.rc-cmp td.ed:hover{box-shadow:inset 0 0 0 1px var(--ln2);}
.rc-cmp textarea{min-width:200px;font-size:13px;}
@media(max-width:700px){.rc-pi-add{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}}
.rc-s3-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:2px 0 12px;}
.rc-seg.rc-s3-seg{width:auto;min-width:228px;}
.rc-seg.rc-s3-seg button{padding:7px 10px;font-size:13px;}
.rc-s3-wrap{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start;}
.rc-s3-stage{position:relative;height:calc(100vh - 205px);height:calc(100dvh - 205px);min-height:480px;border-radius:12px;overflow:hidden;border:1px solid var(--ln);background:var(--sf2);box-shadow:var(--sh1);}
.rc-s3-gl{position:absolute;inset:0;}
.rc-s3-side{max-height:calc(100vh - 205px);max-height:calc(100dvh - 205px);overflow-y:auto;}
.s3-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;}
.s3-canvas.hover{cursor:pointer;}
.s3-canvas:focus-visible{outline:2px solid var(--ac);outline-offset:-2px;}
.s3-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;}
.s3-tag[hidden],.s3-mark[hidden],.s3-plate[hidden],.s3-tip[hidden]{display:none!important;}
.s3-tag{position:absolute;left:0;top:0;pointer-events:auto;border:1px solid var(--ln);background:var(--sf);color:var(--tx);border-radius:999px;padding:5px 11px 5px 8px;font:700 14px/1 var(--fd);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;box-shadow:var(--sh1);display:flex;align-items:center;gap:6px;transform-origin:50% 100%;}
.s3-tag i{width:9px;height:9px;border-radius:3px;background:var(--dot);}
.s3-tag b{color:var(--mt);font-variant-numeric:tabular-nums;}
.s3-tag.on{background:var(--acb);border-color:var(--acb);color:#fff;}
.s3-tag.on b{color:#fff;}
.s3-tag.hov{border-color:var(--ac);}
.s3-tag:focus-visible,.s3-plate:focus-visible{outline:2px solid var(--ac);outline-offset:2px;}
.s3-mark{position:absolute;left:0;top:0;font:700 12.5px/1 var(--fd);letter-spacing:.14em;text-transform:uppercase;color:var(--bg);background:color-mix(in srgb,var(--tx) 72%,transparent);padding:5px 8px;border-radius:6px;white-space:nowrap;transform-origin:50% 100%;}
.s3-plate{position:absolute;left:0;top:0;pointer-events:auto;border:1px solid var(--ln);background:var(--sf);color:var(--tx);border-radius:6px;padding:3px 7px;font:700 12.5px/1 var(--fd);letter-spacing:.06em;white-space:nowrap;cursor:pointer;transform-origin:50% 100%;font-variant-numeric:tabular-nums;}
.s3-plate.sold{border-color:var(--r);color:var(--r);}
.s3-tip{position:absolute;left:0;top:0;z-index:4;pointer-events:none;background:var(--tx);color:var(--bg);font-size:13px;line-height:1.35;padding:6px 9px;border-radius:7px;white-space:nowrap;box-shadow:var(--sh2);}
.rc-s3-load{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--sf2);text-align:center;padding:16px;}
.rc-s3-lt{font-size:14px;color:var(--tx2);}
.rc-s3-bar{width:min(260px,80%);height:6px;border-radius:9px;background:var(--sf);border:1px solid var(--ln);overflow:hidden;}
.rc-s3-bar span{display:block;height:100%;background:var(--ac);transition:width .25s;}
.rc-s3-hint,.rc-s3-drivebar{position:absolute;left:50%;transform:translateX(-50%);bottom:14px;z-index:3;padding:8px 13px;border-radius:10px;font-size:13px;white-space:nowrap;box-shadow:var(--sh1);max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;}
.rc-s3-hint{background:var(--sf);color:var(--tx2);border:1px solid var(--ln);}
.rc-s3-drivebar{background:var(--acs);color:var(--act);font-weight:600;}
.rc-s3-pad{position:absolute;right:12px;bottom:58px;z-index:3;display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);gap:6px;}
.rc-s3-pad button{border:1px solid var(--ln);background:var(--sf);color:var(--tx);border-radius:10px;font-size:20px;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:var(--sh1);}
.rc-s3-pad button:active{background:var(--acs);color:var(--act);}
.rc-s3-pad .u{grid-column:2;}.rc-s3-pad .l{grid-column:1;grid-row:2;}.rc-s3-pad .d{grid-column:2;grid-row:2;}.rc-s3-pad .r{grid-column:3;grid-row:2;}
.rc-s3-card{padding:14px 16px;margin-bottom:12px;}
.rc-s3-h{font:700 19px/1.15 var(--fd);color:var(--tx);margin-bottom:6px;}
.rc-s3-h.big{font-size:24px;letter-spacing:.02em;text-transform:uppercase;margin:6px 0;}
.rc-s3-sub{font-size:13px;color:var(--mt);margin-top:2px;}
.rc-s3-where{font-size:14.5px;color:var(--tx2);margin:12px 0;}
.rc-s3-where span{color:var(--mt);}
.rc-s3-warn{font-size:13px;color:var(--w);background:var(--ws);border-radius:9px;padding:8px 10px;margin:4px 0 10px;line-height:1.45;}
.rc-s3-chips{display:flex;gap:6px;flex-wrap:wrap;}
.rc-s3-chip{font:700 11.5px/1 var(--fd);letter-spacing:.12em;text-transform:uppercase;padding:5px 8px;border-radius:6px;background:var(--sf2);color:var(--mt);border:1px solid var(--ln);}
.rc-s3-chip.k{background:var(--acs);color:var(--act);border-color:transparent;}
.rc-s3-p{font-size:14px;line-height:1.55;color:var(--tx2);margin:0 0 8px;}
.rc-s3-ul{margin:0 0 10px;padding:0;list-style:none;display:grid;gap:5px;}
.rc-s3-ul li{font-size:13.5px;color:var(--tx2);display:flex;gap:8px;align-items:baseline;}
.rc-s3-ul li::before{content:"";width:6px;height:6px;border-radius:2px;background:var(--ac);flex:none;transform:translateY(-2px);}
.rc-s3-elist{display:grid;gap:2px;margin:4px 0 8px;}
.rc-s3-erow{display:flex;justify-content:space-between;gap:8px;align-items:center;width:100%;text-align:left;border:0;border-top:1px solid var(--ln2);background:none;padding:8px 2px;cursor:pointer;color:var(--tx);font-family:var(--fb);}
.rc-s3-erow b{display:block;font-size:14px;}
.rc-s3-erow span span{display:block;font-size:12.5px;color:var(--mt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rc-s3-erow:hover b{color:var(--act);}
.rc-s3-empty{font-size:13.5px;color:var(--mt);padding:4px 0 8px;}
.rc-s3-pg{font:700 12px/1 var(--fd);letter-spacing:.14em;text-transform:uppercase;color:var(--mt);padding:12px 2px 6px;}
.rc-s3-pl{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:none;border-radius:8px;padding:7px 6px;font-size:14px;cursor:pointer;color:var(--tx2);font-family:var(--fb);}
.rc-s3-pl i{width:10px;height:10px;border-radius:3px;flex:none;background:var(--dot);}
.rc-s3-pl small{margin-left:auto;color:var(--mt);font-size:12.5px;font-variant-numeric:tabular-nums;white-space:nowrap;}
.rc-s3-pl:hover{background:var(--sf2);color:var(--tx);}
.rc-s3-note{font-size:12.5px;color:var(--mt);line-height:1.5;padding:10px 2px 2px;border-top:1px solid var(--ln2);margin-top:8px;}
.rc-s3-hrow{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;}
.rc-aging{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;padding:16px;margin-bottom:16px;}
.rc-aging-v{font:700 21px/1.2 var(--fd);margin-top:4px;font-variant-numeric:tabular-nums;}
.rc-pl{padding:16px;margin-bottom:16px;}
.rc-pl-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;}
.rc-pl-t{font:700 15.5px/1 var(--fd);letter-spacing:2px;text-transform:uppercase;color:var(--tx2);}
.rc-pl-sub{font-size:13px;color:var(--mt);margin-bottom:12px;}
.rc-pl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.rc-pl-r{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:14px;font-variant-numeric:tabular-nums;}
.rc-pl-r>span:first-child{color:var(--tx2);}
.rc-pl-r>span:last-child{font-weight:600;white-space:nowrap;}
.rc-pl-r.tot{padding-top:6px;margin-top:4px;border-top:1px solid var(--ln);font-size:14.5px;font-weight:700;}
.rc-pl-r.tot>span:first-child{color:var(--tx);}
.rc-pl-net{font:800 24px/1.1 var(--fd);margin-top:8px;font-variant-numeric:tabular-nums;}
.rc-pl-note{font-size:12.5px;color:var(--mt);margin-top:4px;line-height:1.45;}
.rc-pl-foot{font-size:12.5px;color:var(--mt);border-top:1px solid var(--ln2);margin-top:12px;padding-top:8px;line-height:1.5;}
.rc-li{display:grid;grid-template-columns:minmax(0,1fr) 60px 110px 36px;gap:6px;margin-bottom:6px;}
.rc-li-h{margin-bottom:2px;font-size:12px;font-weight:600;color:var(--mt);letter-spacing:.04em;}
.rc-tot{font-size:14px;color:var(--tx2);text-align:right;font-variant-numeric:tabular-nums;}
.rc-tot strong{color:var(--act);}
.rc-why{font-size:13px;color:var(--w);text-align:right;margin-top:6px;}
.rc-hint{font-size:12.5px;color:var(--mt);margin-top:4px;line-height:1.45;}
.rc-inv-sell{background:var(--sf2);border:1px solid var(--ln);border-radius:10px;padding:10px 12px;margin-bottom:12px;}
.rc-chk{display:flex;gap:8px;align-items:flex-start;font-size:14px;font-weight:500;cursor:pointer;}
.rc-chk input{margin-top:3px;}
@media(max-width:700px){.rc-aging{grid-template-columns:repeat(2,minmax(0,1fr));}.rc-pl-grid{grid-template-columns:minmax(0,1fr);}}
.rc-s3-crewst{font-size:14px;color:var(--tx2);margin:2px 0 8px;}
.rc-s3-meter{display:flex;justify-content:space-between;align-items:baseline;gap:10px;background:var(--gs);border-radius:9px;padding:9px 11px;margin:4px 0 8px;}
.rc-s3-meter span{font-size:13px;color:var(--tx2);}
.rc-s3-meter b{font:700 22px/1 var(--fd);color:var(--g);font-variant-numeric:tabular-nums;white-space:nowrap;}
.rc-s3-rate{font-size:12.5px;color:var(--mt);font-variant-numeric:tabular-nums;white-space:nowrap;}
.rc-s3-clock{position:absolute;left:12px;top:12px;z-index:3;display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;max-width:calc(100% - 24px);padding:7px 8px 7px 12px;border-radius:10px;background:var(--sf);border:1px solid var(--ln);box-shadow:var(--sh1);font-size:13.5px;color:var(--tx2);}
.rc-s3-clock b{font:700 18px/1 var(--fd);color:var(--tx);font-variant-numeric:tabular-nums;}
.rc-s3-clock .pay{font:700 16px/1 var(--fd);color:var(--g);font-variant-numeric:tabular-nums;}
.rc-s3-clock .rc-bs{padding:5px 10px;font-size:13px;}
.s3-who{position:absolute;left:0;top:0;pointer-events:auto;border:1px solid var(--ln);background:var(--sf);color:var(--tx);border-radius:999px;padding:3px 9px 3px 7px;font:700 12.5px/1 var(--fd);letter-spacing:.04em;white-space:nowrap;cursor:pointer;transform-origin:50% 100%;display:flex;align-items:center;gap:5px;}
.s3-who::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--b);flex:none;}
.s3-who:focus-visible{outline:2px solid var(--ac);outline-offset:2px;}
.s3-pay{position:absolute;left:0;top:0;z-index:3;pointer-events:none;border:1.5px solid var(--g);background:var(--sf);color:var(--g);border-radius:999px;padding:4px 10px;font:800 16px/1 var(--fd);letter-spacing:.02em;white-space:nowrap;box-shadow:var(--sh1);transform-origin:50% 100%;font-variant-numeric:tabular-nums;}
.s3-who[hidden],.s3-pay[hidden]{display:none!important;}
.rc-s3-loc{font-size:12px;color:var(--mt);margin-top:2px;cursor:pointer;width:fit-content;}
.rc-s3-loc:hover,.rc-s3-loc:focus-visible{color:var(--act);text-decoration:underline;outline:none;}
.rc-s3-pass{display:block;font-size:13px;font-weight:500;color:var(--act);margin:0 0 8px;}
.rc-ts-seg{max-width:300px;margin:0 0 16px;}
.rc-ts-seg button{padding:8px 0;font-size:13.5px;}
.rc-ts-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px;}
.rc-ts-sel{width:auto;min-width:170px;flex:0 1 240px;appearance:none;}
.rc-ts-errl{font-size:13px;color:var(--r);margin:4px 0;line-height:1.45;}
.rc-ts-warnl{font-size:13px;color:var(--w);margin-top:4px;line-height:1.45;}
.rc-ts-note{font-size:13px;color:var(--mt);line-height:1.5;margin:4px 0 10px;}
.rc-ts-dim{font-size:12.5px;color:var(--mt);line-height:1.5;}
.rc-ts-ph{font:700 15px/1.2 var(--fd);letter-spacing:.06em;text-transform:uppercase;color:var(--tx2);margin-bottom:8px;}
.rc-ts-today{padding:12px 14px;}
.rc-ts-tl{display:flex;flex-wrap:wrap;gap:8px;}
.rc-ts-tc{display:grid;gap:2px;text-align:left;border:1px solid var(--ln);background:var(--sf);border-radius:10px;padding:8px 11px;cursor:pointer;font-family:var(--fb);color:var(--tx);min-width:150px;}
.rc-ts-tc b{font-size:13.5px;}
.rc-ts-tc span{font-size:12.5px;color:var(--g);}
.rc-ts-tc.none span{color:var(--w);}
.rc-ts-tc:hover{border-color:var(--ac);}
.rc-ts-appr{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px;}
.rc-ts-ok{font-size:14px;font-weight:600;color:var(--g);}
.rc-ts-cnt{font-size:13.5px;font-weight:600;color:var(--w);}
.rc-ts-cnt.info{color:var(--b);}
.rc-ts-tbl th,.rc-ts-tbl td{padding:8px 10px;white-space:nowrap;}
.rc-ts-tbl td.nt,.rc-ts-tbl tr.wk td,.rc-ts-tbl tr.why td,.rc-ts-tbl tr.tot td{white-space:normal;}
.rc-ts-tbl th.n,.rc-ts-tbl td.n{text-align:right;}
.rc-ts-tbl td.nt{max-width:260px;color:var(--tx2);font-size:13px;}
.rc-ts-tbl tr.off td{color:var(--mt);}
.rc-ts-tbl tr.fut td{color:var(--ft);}
.rc-ts-tbl tr.today td{background:var(--acs);}
.rc-ts-tbl tr.wk td{background:var(--sf2);font-size:12.5px;color:var(--tx2);border-bottom:1px solid var(--ln);}
.rc-ts-tbl tr.wk td.n{font-weight:700;color:var(--tx);font-size:13.5px;}
.rc-ts-tbl tr.tot td{font-weight:800;border-top:2px solid var(--ln);font-size:14px;}
.rc-ts-tbl tr.why td{background:var(--sf2);padding:6px 12px 10px;}
.rc-ts-miss{font-size:12px;font-weight:600;color:var(--w);}
.rc-ts-flag{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 8px;margin-right:4px;font:700 12px/1.5 var(--fb);border:0;white-space:nowrap;cursor:pointer;}
.rc-ts-flag.bad{color:var(--r);background:var(--rs);}
.rc-ts-flag.warn{color:var(--w);background:var(--ws);}
.rc-ts-flag.info{color:var(--b);background:var(--bs);}
.rc-ts-lock{font-size:13px;opacity:.75;margin-right:4px;}
.rc-ts-ed{padding:3px 9px;font-size:14px;}
.rc-ts-whyl{font-size:13px;line-height:1.5;padding:2px 0 2px 10px;border-left:3px solid var(--ln);margin:3px 0;color:var(--tx2);}
.rc-ts-whyl.bad{border-color:var(--r);}.rc-ts-whyl.warn{border-color:var(--w);}
.rc-ts-hist{display:grid;gap:4px;margin:8px 0 2px;font-size:13px;}
.rc-ts-hist>div:not(.rc-fl){display:flex;flex-wrap:wrap;gap:4px 10px;color:var(--tx2);}
.rc-ts-hist span{color:var(--mt);min-width:150px;}
.rc-ts-hist .now b{color:var(--tx);}
.rc-ts-ln{font-size:13px;font-weight:600;color:var(--act);}
.rc-ts-pay{border:1px solid var(--ln);border-radius:12px;background:var(--sf);box-shadow:var(--sh1);padding:14px 16px;margin:0 0 14px;display:grid;gap:6px;}
.rc-ts-pay>div:first-child{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.rc-ts-pay b{font:800 26px/1 var(--fd);letter-spacing:.02em;color:var(--tx);}
.rc-ts-util{font-size:13.5px;color:var(--tx2);margin:0 0 20px;line-height:1.55;}
.rc-ts-meter{height:8px;border-radius:9px;background:var(--sf2);overflow:hidden;}
.rc-ts-meter span{display:block;height:100%;background:var(--w);border-radius:9px;}
.rc-ts-prevbar{margin-left:auto;white-space:nowrap;}
.rc-ts-lockwarn{font-size:13px;color:var(--w);background:var(--ws);border-radius:9px;padding:8px 10px;margin:0 0 12px;line-height:1.45;}
.rc-ts-fullbtn{width:100%;padding:11px;font-size:14.5px;font-weight:600;margin:0 0 12px;}
.rc-ts-times{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.rc-ts-times .rc-fi{font-size:16px;}
.rc-ts-live{min-height:22px;margin:-4px 0 12px;font-size:14px;}
.rc-ts-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.rc-ts-loose{align-items:center;margin:-4px 0 12px;}
.rc-ts-radio{display:grid;gap:8px;font-size:14px;color:var(--tx2);}
.rc-ts-radio label{display:flex;gap:8px;align-items:center;cursor:pointer;}
.rc-ts-okbox{border:1px solid var(--g);background:var(--gs);border-radius:10px;padding:12px 14px;margin:0 0 14px;}
.rc-ts-okbox b{color:var(--g);font-size:14.5px;}
.rc-ts-okbox p{font-size:13.5px;color:var(--tx2);margin:4px 0 10px;}
.rc-ts-cred{display:grid;gap:6px;background:var(--sf);border:1px solid var(--ln);border-radius:9px;padding:10px 12px;}
.rc-ts-cred div{display:flex;gap:10px;font-size:14px;flex-wrap:wrap;}
.rc-ts-cred span{color:var(--mt);min-width:72px;}
.rc-ts-cred b{font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all;}
.rc-ts-cred .rc-bs{justify-self:start;margin-top:4px;}
.rc-ts-login{display:grid;gap:10px;margin:0 0 14px;}
.rc-ts-login div{display:grid;gap:2px;}
.rc-ts-login b{font-size:14.5px;word-break:break-all;}
.rc-savebad{margin-left:auto;align-self:center;border:1px solid var(--r);background:var(--rs);color:var(--r);border-radius:999px;padding:5px 12px;font:600 13px/1.3 var(--fb);cursor:pointer;white-space:nowrap;}
.rc-emp{min-height:100vh;background:var(--bg);color:var(--tx);font-family:var(--fb);}
.rc-emp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px;background:var(--sf);border-bottom:1px solid var(--ln);}
.rc-emp-top .rc-logo{padding:0;border:0;margin:0;}
.rc-emp-who{display:grid;justify-items:end;gap:4px;font-size:14px;}
.rc-emp-who .rc-links{display:flex;gap:12px;align-items:center;}
.rc-emp-main{max-width:760px;margin:0 auto;padding:18px 16px 40px;}
.rc-emp-theme{max-width:300px;margin:22px auto 0;}
.rc-my-today{padding:16px 18px;margin-bottom:16px;}
.rc-my-th{font:700 13px/1 var(--fd);letter-spacing:.14em;text-transform:uppercase;color:var(--act);}
.rc-my-td{font:800 26px/1.15 var(--fd);color:var(--tx);margin:4px 0 6px;}
.rc-my-tv{font-size:15px;color:var(--tx2);margin-bottom:12px;}
.rc-my-tv span{color:var(--w);font-weight:600;}
.rc-my-acts{display:flex;flex-wrap:wrap;gap:8px;}
.rc-my-full{padding:12px 16px;font-size:15px;}
.rc-my-month{display:flex;align-items:center;gap:10px;margin:0 0 10px;}
.rc-my-month>div{flex:1;display:grid;text-align:center;}
.rc-my-month b{font:700 19px/1.2 var(--fd);letter-spacing:.04em;text-transform:uppercase;}
.rc-my-month span{font-size:13px;color:var(--mt);}
.rc-my-month .rc-bs{font-size:18px;padding:6px 14px;}
.rc-tbl.rc-my-tbl{min-width:0;}
.rc-my-tbl td,.rc-my-tbl th{padding:9px 10px;}
.rc-my-tbl td.d{white-space:nowrap;}
.rc-my-tbl td.d b{display:inline-block;width:34px;}
.rc-my-tbl th.n,.rc-my-tbl td.n{text-align:right;white-space:nowrap;}
.rc-my-tbl td.act{text-align:right;white-space:nowrap;}
.rc-my-tbl td.act .rc-bs{padding:5px 10px;font-size:13px;margin-left:4px;}
.rc-my-tbl tr.fut td{color:var(--ft);}
.rc-my-tbl tr.today td{background:var(--acs);}
.rc-my-tbl tr.wk td{background:var(--sf2);font-size:12.5px;color:var(--tx2);}
.rc-my-tbl tr.wk td.n{font-weight:700;color:var(--tx);}
.rc-my-note{font-size:12.5px;color:var(--mt);white-space:normal;}
.rc-my-ot{font-size:12px;font-weight:600;color:var(--w);}
.rc-my-fd{border-color:var(--ac);color:var(--act);}
.rc-my-foot{margin-top:12px;}
@media(max-width:700px){.rc-ts-sel{flex:1 1 100%;}.rc-ts-tbl td.nt{max-width:none;}.rc-ts-prevbar{margin-left:0;}.rc-emp-top{padding:12px 16px;}.rc-emp-who{justify-items:start;}}
@media(max-width:600px){.rc-my-tbl td,.rc-my-tbl th{padding:8px 6px;}.rc-my-tbl td.d b{display:block;width:auto;}.rc-my-tbl td.act .rc-bs{display:block;width:100%;margin:0 0 4px;padding:6px 10px;}.rc-my-tbl td.act .rc-bs:last-child{margin-bottom:0;}}
@media print{.rc-ts-bar,.rc-ts-seg,.rc-ts-prevbar{display:none!important;}}
@media(max-width:1100px){.rc-s3-wrap{grid-template-columns:minmax(0,1fr);}.rc-s3-side{max-height:none;}}
@media(max-width:700px){.rc-s3-stage{height:68vh;height:68dvh;min-height:400px;}.rc-seg.rc-s3-seg{min-width:0;flex:1 1 100%;}.rc-s3-hint{white-space:normal;text-align:center;width:calc(100% - 24px);}}
@media(prefers-reduced-motion:reduce){.rc-s3-bar span{transition:none;}}
.rc-tbl tr.rc-grp td{background:var(--sf2);font-size:12.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mt);padding:9px 14px;}
.rc-seg.two button{padding:8px 6px;font-size:13.5px;}
.rc-user{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mt);min-width:0;}
.rc-user span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rc-links{display:flex;gap:2px;flex-wrap:wrap;margin:0 -6px;}
.rc-link{border:0;background:none;color:var(--mt);font-size:12.5px;padding:4px 6px;border-radius:6px;cursor:pointer;}
.rc-link:hover{background:var(--sf2);color:var(--tx);}
.rc-dot{width:8px;height:8px;border-radius:50%;background:var(--g);box-shadow:0 0 0 3px var(--gs);flex-shrink:0;}
.rc-main{min-width:0;display:flex;flex-direction:column;}
.rc-top{display:flex;align-items:center;gap:12px;padding:22px 30px 2px;}
.rc-pt{font:700 30px/1.05 var(--fd);letter-spacing:.3px;color:var(--tx);}
.rc-psub{font-size:13px;color:var(--mt);margin-top:3px;}
.rc-menu{display:none;width:40px;height:40px;border:1px solid var(--ln);border-radius:10px;background:var(--sf);color:var(--tx);cursor:pointer;place-items:center;flex-shrink:0;}
.rc-scrim{display:none;}
.rc-body{padding:18px 30px 44px;max-width:1440px;width:100%;}
.rc-g6{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;}
.rc-g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;}
.rc-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.rc-2col{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px;}
.rc-stat{background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:15px 16px;box-shadow:var(--sh1);}
.rc-sl{font-size:12.5px;font-weight:500;color:var(--mt);margin-bottom:6px;}
.rc-sv{font:700 34px/1.02 var(--fd);letter-spacing:.2px;color:var(--tx);font-variant-numeric:tabular-nums;}
.rc-ss{font-size:12.5px;margin-top:6px;color:var(--mt);}
.rc-ss.up{color:var(--g);}.rc-ss.dn{color:var(--r);}
.rc-sh{display:flex;align-items:center;justify-content:space-between;margin:6px 0 12px;flex-wrap:wrap;gap:10px;}
.rc-sht{font:700 21px/1.1 var(--fd);letter-spacing:.3px;color:var(--tx);}
.rc-card{background:var(--sf);border:1px solid var(--ln);border-radius:12px;margin-bottom:18px;overflow-x:auto;box-shadow:var(--sh1);}
.rc-tbl{width:100%;border-collapse:collapse;min-width:480px;font-variant-numeric:tabular-nums;}
.rc-tbl th{padding:10px 14px;text-align:left;font-size:11.5px;font-weight:650;letter-spacing:.7px;text-transform:uppercase;color:var(--mt);border-bottom:1px solid var(--ln);background:var(--sf2);white-space:nowrap;}
.rc-tbl td{padding:11px 14px;font-size:13.5px;color:var(--tx);border-bottom:1px solid var(--ln2);vertical-align:middle;}
.rc-tbl tr:last-child td{border-bottom:0;}
.rc-tbl tbody tr:hover td{background:var(--sf2);}
.rc-tn{font-weight:600;font-size:14px;color:var(--tx);}
.rc-ba{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border:1px solid transparent;border-radius:9px;background:var(--acb);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background .12s;box-shadow:0 1px 2px rgba(150,60,10,.22);}
.rc-ba:hover{background:var(--acbh);}
.rc-ba:disabled{opacity:.5;cursor:default;}
.rc-bs{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border:1px solid var(--ln);border-radius:8px;background:var(--sf);color:var(--tx);font-size:13px;font-weight:500;cursor:pointer;transition:border-color .12s,color .12s,background .12s;}
.rc-bs:hover{border-color:var(--ac);color:var(--act);}
.rc-bs:disabled{opacity:.5;cursor:default;}
.rc-bsg{background:var(--gs);border-color:color-mix(in srgb,var(--g) 40%,transparent);color:var(--g);}
.rc-bsg:hover{background:var(--g);border-color:var(--g);color:#fff;}
.rc-bsr{background:var(--rs);border-color:color-mix(in srgb,var(--r) 35%,transparent);color:var(--r);}
.rc-bsr:hover{background:var(--r);border-color:var(--r);color:#fff;}
.rc-fb{padding:6px 12px;border:1px solid var(--ln);border-radius:999px;background:var(--sf);color:var(--tx2);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .12s;}
.rc-fb:hover{border-color:var(--ft);color:var(--tx);}
.rc-fb.on{border-color:var(--ac);color:var(--act);background:var(--acs);}
.rc-si{padding:8px 12px;background:var(--in);border:1px solid var(--ln);border-radius:9px;color:var(--tx);font-size:13.5px;outline:none;width:220px;transition:border-color .12s,box-shadow .12s;}
.rc-si:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--acs);}
.rc-si::placeholder{color:var(--ft);}
.rc-gc{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:18px;}
.rc-cc{background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:16px;cursor:pointer;box-shadow:var(--sh1);transition:border-color .12s,box-shadow .12s;}
.rc-cc:hover{border-color:color-mix(in srgb,var(--ac) 45%,var(--ln));box-shadow:var(--sh2);}
.rc-ccn{font-weight:700;font-size:16px;margin-bottom:2px;color:var(--tx);}
.rc-3c{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.rc-ml{font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--mt);}
.rc-mv{font:700 20px/1.15 var(--fd);color:var(--tx);font-variant-numeric:tabular-nums;}
.rc-board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;}
.rc-rboard{display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));gap:12px;margin-bottom:18px;overflow-x:auto;padding-bottom:6px;align-items:start;}
@media(max-width:700px){.rc-rboard{grid-template-columns:minmax(0,1fr);overflow-x:visible;}.rc-rboard .rc-bcol{min-height:0;}}
.rc-bcol{background:var(--sf2);border:1px solid var(--ln);border-radius:12px;min-height:240px;}
.rc-bh{padding:11px 13px;border-bottom:1px solid var(--ln);display:flex;align-items:center;justify-content:space-between;}
.rc-bt{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--tx2);}
.rc-bc{font-size:12px;font-weight:700;color:var(--act);background:var(--acs);padding:2px 9px;border-radius:999px;}
.rc-jc{background:var(--sf);border:1px solid var(--ln);border-left:3px solid transparent;border-radius:10px;padding:11px;cursor:pointer;box-shadow:var(--sh1);transition:box-shadow .12s;}
.rc-jc:hover{box-shadow:var(--sh2);}
.rc-jc.high{border-left-color:var(--r);}.rc-jc.medium{border-left-color:var(--w);}.rc-jc.low{border-left-color:var(--g);}
.rc-jcn{font-weight:700;font-size:14px;margin-bottom:2px;color:var(--tx);}
.rc-qty{display:inline-flex;align-items:center;border:1px solid var(--ln);border-radius:8px;overflow:hidden;}
.rc-qb{width:26px;height:26px;background:var(--sf2);border:none;color:var(--tx2);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.rc-qb:hover{background:var(--acs);color:var(--act);}
.rc-qv{width:34px;text-align:center;font-size:13px;font-weight:600;background:var(--sf);color:var(--tx);}
.rc-ov{position:fixed;inset:0;background:var(--ov);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;backdrop-filter:blur(2px);}
.rc-mod{background:var(--sf);color:var(--tx);border:1px solid var(--ln);border-radius:16px;padding:22px;width:92%;max-width:600px;max-height:88vh;overflow-y:auto;box-shadow:0 30px 80px -30px rgba(0,0,0,.45);}
.rc-mt{font:700 24px/1.1 var(--fd);letter-spacing:.3px;margin-bottom:14px;color:var(--tx);}
.rc-fg{margin-bottom:12px;}
.rc-fl{display:block;font-size:12.5px;font-weight:600;color:var(--tx2);margin-bottom:5px;}
.rc-fi{width:100%;padding:9px 11px;background:var(--in);border:1px solid var(--ln);border-radius:9px;color:var(--tx);font-size:14px;outline:none;transition:border-color .12s,box-shadow .12s;}
.rc-fi:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--acs);}
.rc-fi::placeholder{color:var(--ft);}
.rc-fa{display:flex;gap:10px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap;}
.rc-goal{padding:16px 18px;margin-bottom:18px;}
.rc-goal-top{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.rc-goal-v{font:700 28px/1 var(--fd);color:var(--tx);font-variant-numeric:tabular-nums;}
.rc-goal-v em{font-style:normal;color:var(--mt);font-size:17px;}
.rc-goal-best{font:700 12px var(--fd);letter-spacing:1.5px;color:var(--w);border:1px solid var(--w);border-radius:999px;padding:2px 10px;background:var(--ws);}
.rc-goal-bar{height:12px;background:var(--sf2);border:1px solid var(--ln);border-radius:999px;overflow:hidden;position:relative;}
.rc-goal-mark{position:absolute;top:0;bottom:0;width:2px;background:var(--w);}
.rc-goal-fill{height:100%;border-radius:999px;transition:width .6s;}
.rc-goal-sub{font-size:12.5px;color:var(--mt);margin-top:8px;}
.rc-lm{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px;}
.rc-lm-c{display:flex;align-items:center;gap:7px;border:1px solid var(--ln);border-radius:999px;padding:5px 11px;background:var(--sf);}
.rc-lm-c.done{border-color:var(--g);background:var(--gs);}
.rc-lm-l{font-size:12px;color:var(--mt);}
.rc-lm-n{font:700 14px var(--fd);color:var(--tx);}
.rc-lm-b{width:44px;height:5px;background:var(--sf2);border-radius:3px;overflow:hidden;}
.rc-lm-b div{height:100%;background:var(--ac);border-radius:3px;}
.rc-lm-c.done .rc-lm-b div{background:var(--g);}
.rc-lm-full{font:700 13px var(--fd);letter-spacing:1.5px;color:var(--g);border:1px solid var(--g);border-radius:999px;padding:4px 12px;background:var(--gs);}
.rc-act{display:flex;gap:9px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--ln2);font-size:13px;}
.rc-act:last-child{border-bottom:none;}
.rc-act-t{color:var(--mt);font-size:11.5px;width:38px;flex-shrink:0;}
.rc-act-u{color:var(--act);font-size:12px;font-weight:600;flex-shrink:0;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rc-gap{font-size:13px;color:var(--w);padding:3px 0;}
.rc-win{display:flex;gap:9px;align-items:center;padding:7px 0;border-bottom:1px solid var(--ln2);font-size:13px;}
.rc-win:last-child{border-bottom:none;}
.rc-win-i{font-size:17px;}
.rc-win-d{color:var(--mt);font-size:11.5px;}
.rc-win-p{font:700 16px var(--fd);color:var(--g);}
.rc-splash{position:fixed;inset:0;z-index:3000;background:rgba(10,10,10,.9);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:fdin .25s;color:#f3efe8;}
@keyframes fdin{from{opacity:0}to{opacity:1}}
.rc-splash-in{text-align:center;padding:30px;}
.rc-stamp{display:inline-block;font:900 min(110px,22vw)/1 var(--fd);letter-spacing:6px;color:#ff6a20;border:7px solid #ff6a20;border-radius:14px;padding:6px 28px;transform:rotate(-8deg);box-shadow:0 0 60px rgba(255,106,32,.55),inset 0 0 30px rgba(255,106,32,.25);animation:stampin .45s cubic-bezier(.2,1.6,.4,1);}
@keyframes stampin{0%{transform:rotate(-8deg) scale(2.6);opacity:0;}60%{opacity:1;}100%{transform:rotate(-8deg) scale(1);}}
.rc-spl-name{font:800 28px var(--fd);margin-top:26px;letter-spacing:1px;}
.rc-spl-price{font:900 46px var(--fd);color:#6fd98a;margin-top:6px;}
.rc-spl-margin{font-size:16px;color:#f0c14a;margin-top:8px;font-weight:600;}
.rc-spl-margin.dim{color:#9a958c;font-style:italic;font-weight:400;}
.rc-spl-note{font-size:12px;color:#8a857c;margin-top:18px;letter-spacing:1px;text-transform:uppercase;}
.rc-splash-mute{position:absolute;top:18px;right:18px;font-size:16px;}
.rc-bomtick{font-size:12px;padding:3px 6px;}
.rc-noprint{}.rc-print-only{display:none;}.rc-print-header{display:none;}
@media(prefers-reduced-motion:reduce){.rc-root *{animation:none!important;transition:none!important;}}
@media(max-width:900px){
.rc-shell{grid-template-columns:minmax(0,1fr);}
.rc-side{position:fixed;left:0;top:0;bottom:0;width:276px;transform:translateX(-104%);transition:transform .22s ease;box-shadow:var(--sh2);}
.rc-shell.nav-open .rc-side{transform:none;}
.rc-scrim{display:block;position:fixed;inset:0;background:var(--ov);z-index:55;opacity:0;pointer-events:none;transition:opacity .22s;}
.rc-shell.nav-open .rc-scrim{opacity:1;pointer-events:auto;}
.rc-menu{display:inline-grid;}
.rc-top{position:sticky;top:0;z-index:40;background:var(--bg);padding:12px 16px 10px;border-bottom:1px solid var(--ln);}
.rc-pt{font-size:24px;}
.rc-body{padding:14px 16px 36px;}
.rc-2col{grid-template-columns:1fr;}.rc-board{grid-template-columns:1fr;}.rc-g6,.rc-g4,.rc-g3{grid-template-columns:repeat(2,1fr);}.rc-gc{grid-template-columns:1fr;}.rc-si{width:100%;}
}
@media(max-width:600px){.rc-mod{width:100%!important;max-width:100%!important;max-height:100vh!important;border-radius:0!important;}.rc-ov{padding:0!important;}}
@media print{
.rc-root,.rc-root[data-theme="night"]{--bg:#fff;--sf:#fff;--sf2:#f4f4f4;--in:#fff;--ln:#cfcfcf;--ln2:#e3e3e3;--tx:#111;--tx2:#333;--mt:#555;--ft:#888;--ac:#d4581a;--act:#b44810;--acs:#fbede4;--g:#1e7a34;--w:#8a5a00;--r:#b3261e;--b:#1f5f99;color-scheme:light;background:#fff!important;}
.rc-side,.rc-top,.rc-scrim,.rc-noprint,.rc-ov,.rc-ba,.rc-bs,.rc-bsg,.rc-bsr,.rc-fb,.rc-si,.rc-qty,.rc-qb,.rc-splash,.rc-goal,.rc-lm{display:none!important;}
.rc-shell{display:block!important;}
.rc-body{padding:0!important;max-width:none!important;}
.rc-stat,.rc-card{box-shadow:none!important;break-inside:avoid;}
.rc-card{overflow:visible!important;}
.rc-tbl{min-width:0!important;}
.rc-tbl tbody tr:hover td{background:transparent!important;}
.rc-print-only{display:block!important;}
.rc-print-header{display:flex!important;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:10px;border-bottom:3px solid #d4581a;}
.rc-print-header h1{font:800 22px var(--fd);letter-spacing:2px;text-transform:uppercase;color:#111;margin:0;}
.rc-print-header .rc-ph-sub{font-size:11px;color:#666;text-align:right;}
.rc-root:has(.rc-pmod) .rc-shell{display:none!important;}
.rc-ov.rc-pmod{position:static!important;display:block!important;background:#fff!important;backdrop-filter:none!important;padding:0!important;}
.rc-ov.rc-pmod .rc-mod{max-width:100%!important;width:100%!important;max-height:none!important;overflow:visible!important;border:none!important;box-shadow:none!important;padding:0!important;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
}`;

// ═══════════════════════════════════════════════════════════════
// LOGIN (only shown when Supabase is configured — see lib/auth.js)
// ═══════════════════════════════════════════════════════════════
function Login({onAuthed,theme}){
  const[email,setEmail]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);
  const submit=async(e)=>{if(e)e.preventDefault();if(busy||!email||!pw)return;setErr("");setBusy(true);const{session,error}=await signIn(email.trim(),pw);setBusy(false);if(error){setErr(error);return;}if(session)onAuthed(session);};
  return (<div className="rc-root" data-theme={theme} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}><style>{CSS}</style>
    <form onSubmit={submit} className="rc-card" style={{width:"100%",maxWidth:360,padding:24,marginBottom:0}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><div className="rc-hi">RC</div><div><div className="rc-hn">Rollin Coal</div><div className="rc-hs">Diesel Engine Specialists</div></div></div>
      <div className="rc-mt" style={{marginBottom:14}}>Staff Sign In</div>
      <div className="rc-fg"><label className="rc-fl">Email</label><input className="rc-fi" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@rollin-coal.ca" autoFocus/></div>
      <div className="rc-fg"><label className="rc-fl">Password</label><input className="rc-fi" type="password" autoComplete="current-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/></div>
      {err&&<div style={{fontSize:13,color:"var(--r)",margin:"4px 0 8px",fontFamily:"var(--fb)"}}>{err}</div>}
      <button className="rc-ba" type="submit" disabled={busy||!email||!pw} style={{width:"100%",marginTop:6}}>{busy?"Signing in…":"Sign In"}</button>
      <div style={{fontSize:12,color:"var(--mt)",marginTop:14,lineHeight:1.6}}>Accounts are created by the shop owner. Contact your administrator if you need access.</div>
    </form>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
// Sidebar icons (stroke-only, currentColor) and the theme switch options.
const ICO={
  home:<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>,
  eng:<><path d="M3 9h3l2-2h8l2 2h3v8h-3l-2 2H8l-2-2H3z"/><path d="M9 12h6"/></>,
  clip:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h6"/></>,
  box:<><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></>,
  wrench:<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-.4-.4-2.1z"/>,
  mega:<><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></>,
  doc:<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  cash:<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M21 20c0-2.5-1.8-4.3-4-4.8"/></>,
  truck:<><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>,
  cal:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  team:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
  chart:<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>,
  target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
  flag:<><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>,
  chip:<><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/></>,
  tag:<><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/></>,
  shop:<><path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8M3 21h18M7 16h10"/></>,
  menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
};
const Ico=({n})=>(<svg className="rc-ico" viewBox="0 0 24 24" aria-hidden="true">{ICO[n]}</svg>);
const THEMES=[["day","☀","Day"],["night","☾","Night"],["auto","◐","Auto"]];

export default function App(){
  const[s,d]=useReducer(reducer,EMPTY);const[loading,setLoading]=useState(true);const[loadErr,setLoadErr]=useState(false);const[time,setTime]=useState(new Date());
  const lastSaved=useRef(null);const sRef=useRef(s);sRef.current=s;
  // Lists this device loaded that were never stored (seeds): their first save sends the whole list too.
  const fresh=useRef(new Set());const took=data=>{fresh.current=new Set(data.__fresh||[]);delete data.__fresh;lastSaved.current=data;d({type:"LOAD",d:data});};
  // Colour theme is a per-device preference (lib/prefs.js), never shop data: Day by default, Night, or Auto (follow the phone/computer).
  const[themePref,setThemePref]=useState(()=>getPref("rc:theme","day"));
  const[sysDark,setSysDark]=useState(()=>{try{return window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){return false;}});
  const[navOpen,setNavOpen]=useState(false);
  useEffect(()=>{let mq;try{mq=window.matchMedia("(prefers-color-scheme: dark)");}catch(e){return;}const f=e=>setSysDark(e.matches);if(mq.addEventListener)mq.addEventListener("change",f);else mq.addListener(f);return()=>{if(mq.removeEventListener)mq.removeEventListener("change",f);else mq.removeListener(f);};},[]);
  const theme=themePref==="night"||(themePref==="auto"&&sysDark)?"night":"day";
  useEffect(()=>{try{document.documentElement.style.colorScheme=theme==="night"?"dark":"light";document.body.style.background=theme==="night"?"#121314":"#f3f2ef";document.body.style.margin="0";}catch(e){}},[theme]);
  const chooseTheme=k=>{setThemePref(k);setPref("rc:theme",k);};
  const[session,setSession]=useState(null);const[authReady,setAuthReady]=useState(!usingCloud);
  const authed=!usingCloud||!!session;
  // Who's signed in: the owner (everything), office staff (the whole dashboard, no wages) or an employee (their own
  // timesheet only). Migrations 0011 and 0013 hold the rules; a login with no role has no access at all until the
  // owner gives it one from the Team tab. Local mode has no logins: the owner.
  const meta=(session&&session.user&&session.user.app_metadata)||{};
  const role=!usingCloud?"owner":["owner","staff","employee"].includes(meta.role)?meta.role:"none";
  const isOwner=role==="owner",isEmployee=role==="employee";const empId=isEmployee&&meta.employeeId!=null&&meta.employeeId!==""?meta.employeeId:null;
  // The owner can look through other eyes: "staff" (Preview as staff) or {emp, name} (See …'s screen).
  const[preview,setPreview]=useState(null);const ownerView=isOwner&&!preview;
  useEffect(()=>{setPreview(null);},[role]);
  // Auth bootstrap (cloud only): read any existing session, then subscribe to login/logout.
  useEffect(()=>{if(!usingCloud)return;let sub;(async()=>{try{setSession(await getSession());}catch(e){}setAuthReady(true);sub=onAuthChange(ns=>setSession(ns));})();return()=>{try{if(sub)sub.unsubscribe();}catch(e){}};},[]);
  // Attribute activity-log entries to the signed-in user
  useEffect(()=>{setActivityUser(session&&session.user&&session.user.email?session.user.email.split("@")[0]:"shop");},[session]);
  // SOLD splash: air horn (unless muted) + auto-dismiss
  useEffect(()=>{if(!s.soldSplash)return;if(getSet(s).soundOn!==false)horn();const t=setTimeout(()=>d({type:"SPLASH",d:null}),6500);return()=>clearTimeout(t);},[s.soldSplash]);
  // Load data once authenticated (immediately in localStorage mode). Never loads/saves while logged out.
  useEffect(()=>{if(!authed||role==="none"){setLoading(false);return;}let off=false;setLoading(true);setLoadErr(false);(async()=>{try{const data=await loadAll(role);if(off)return;if(data.__loadError){setLoadErr(true);setLoading(false);return;}took(data);}catch(e){if(!off)setLoadErr(true);}if(!off)setLoading(false);})();return()=>{off=true;};},[authed,role]);
  // A scanned QR tag (?engine=<id>) opens that engine's record once the shop's data is in (after signing in).
  useEffect(()=>{if(loading||!authed||loadErr)return;const id=takeEngineParam();if(!id)return;
    if(role==="employee"||role==="none"){d({type:"TOAST",d:{msg:"That tag opens an engine's record, and this login doesn't have access to the inventory.",t:Date.now(),long:true}});return;}
    const eng=(sRef.current.inventory||[]).find(x=>sameId(x.id,id));
    if(eng){d({type:"TAB",v:"inventory"});d({type:"MODAL",v:"part-detail",d:{...eng,ptab:"overview"}});}else d({type:"TOAST",d:{msg:"That engine isn't in the inventory any more.",t:Date.now(),long:true}});},[loading,authed,loadErr,role]);
  // Saving. One save runs at a time, in order, and each compares the lists with what was last saved, so an undo right
  // after a delete still goes through. A save that can't reach the server is retried (on a timer, when the connection
  // comes back, when the app comes back to the front) and the header says so until it lands. A row the database turns
  // down (a timesheet day in an approved period, a pay period approved twice) is put back to what's saved, with the reason.
  const saveQ=useRef(Promise.resolve());const retryT=useRef(null);const fails=useRef(0);const[saveBad,setSaveBad]=useState(false);
  const live=useRef({});live.current={role,authed,loadErr};
  const isDirty=()=>{const prev=lastSaved.current;return !!prev&&keysFor(live.current.role).some(k=>sRef.current[k]!==prev[k]);};
  const putBack=async(refused,cur)=>{const keys=Object.keys(refused);const want=[...new Set([...keys,...(keys.includes("timesheets")?["payPeriods"]:[])])];let m=null;try{m=await db.getAll(want.map(k=>"rc:"+k));}catch(e){return;}
    const upd={},snap={};want.forEach(k=>{let server=[];try{server=JSON.parse(m["rc:"+k]||"[]")||[];}catch(e){}const ids=new Set((refused[k]||[]).map(x=>String(x.id)));
      if(!ids.size){if(sRef.current[k]===lastSaved.current[k])upd[k]=snap[k]=server;return;}
      const byId=new Map(server.map(x=>[String(x.id),x]));const swap=list=>{const out=[],seen=new Set();(list||[]).forEach(x=>{const id=String(x.id);if(!ids.has(id)){out.push(x);return;}seen.add(id);if(byId.has(id))out.push(byId.get(id));});ids.forEach(id=>{if(!seen.has(id)&&byId.has(id))out.push(byId.get(id));});return out;};
      const fixed=swap(lastSaved.current[k]);snap[k]=fixed;upd[k]=sRef.current[k]===cur[k]?fixed:swap(sRef.current[k]);});
    lastSaved.current={...lastSaved.current,...snap};d({type:"LOAD",d:upd});d({type:"TOAST",d:{msg:refusedMsg(refused,upd.payPeriods||sRef.current.payPeriods),t:Date.now(),long:true}});};
  const saveRef=useRef(null);saveRef.current=()=>{const job=saveQ.current.then(async()=>{const{role:rl,authed:au,loadErr:le}=live.current;const prev=lastSaved.current;if(!prev||!au||le)return;
    const cur=sRef.current;const dirty=keysFor(rl).filter(k=>cur[k]!==prev[k]);if(!dirty.length){fails.current=0;setSaveBad(false);return;}
    const r=await saveAll(cur,dirty,prev,rl,fresh.current);const snap={...(lastSaved.current||{})};dirty.forEach(k=>{if(!r.failed.includes(k)){snap[k]=cur[k];fresh.current.delete(k);}});lastSaved.current=snap;
    if(Object.keys(r.refused).length)await putBack(r.refused,cur);
    clearTimeout(retryT.current);
    if(r.failed.length){fails.current++;setSaveBad(true);if(fails.current===1)d({type:"TOAST",d:{msg:"⚠ Couldn't save. It keeps trying, and the top of the screen says so until it's saved.",t:Date.now(),long:true}});retryT.current=setTimeout(()=>saveRef.current(),Math.min(60000,4000*2**Math.min(fails.current-1,4)));}
    else{fails.current=0;setSaveBad(false);}});saveQ.current=job.catch(()=>{});return job;};
  useEffect(()=>{if(loading||!authed||loadErr||!lastSaved.current)return;const t=setTimeout(()=>saveRef.current(),500);return()=>clearTimeout(t);},[s.customers,s.jobs,s.quotes,s.inventory,s.invoices,s.schedule,s.employees,s.expenses,s.leads,s.social,s.campaigns,s.contentCalendar,s.cores,s.shipments,s.commsLog,s.purchaseOrders,s.warranties,s.parts,s.timeEntries,s.wins,s.activity,s.settings,s.diagnoses,s.issues,s.brief,s.boms,s.bomSheets,s.vendors,s.services,s.ecmJobs,s.ecmFiles,s.prospects,s.competitors,s.compare,s.timesheets,s.payPeriods,loading,authed,loadErr,role]);
  // Retry as soon as the connection or the app comes back; warn before closing the page with changes not saved yet.
  useEffect(()=>{const kick=()=>{if(document.visibilityState==="visible"&&isDirty())saveRef.current();};const warn=e=>{if(isDirty()){e.preventDefault();e.returnValue="";}};
    window.addEventListener("online",kick);document.addEventListener("visibilitychange",kick);window.addEventListener("beforeunload",warn);
    return()=>{window.removeEventListener("online",kick);document.removeEventListener("visibilitychange",kick);window.removeEventListener("beforeunload",warn);clearTimeout(retryT.current);};},[]);
  // Signing out waits for anything not saved yet; if it still can't save, a second tap within 10 s leaves anyway.
  const leaveAt=useRef(0);const leave=async()=>{try{await saveRef.current();}catch(e){}if(isDirty()&&Date.now()-leaveAt.current>10000){leaveAt.current=Date.now();d({type:"TOAST",d:{msg:"Some changes aren't saved yet (no connection?). Tap Sign out again within 10 seconds to leave without them.",t:Date.now(),long:true}});return;}await signOut();setSession(null);};
  const saveBadge=saveBad?(<button className="rc-savebad" onClick={()=>saveRef.current()} title="Changes made on this device haven't reached the server yet. Tap to try again now.">⚠ Not saved yet · retrying</button>):null;
  // Live sync: quietly re-pull the shop's data on window focus and every 60s
  // (cloud only, never while a modal is open or local changes are unsaved),
  // so a tab left open overnight can't overwrite the crew's newer work.
  useEffect(()=>{if(!usingCloud||!authed||loading)return;let busy=false;const refresh=async()=>{const before=sRef.current;const prev=lastSaved.current;if(busy||document.hidden||!prev||before.modal)return;if(keysFor(role).some(k=>before[k]!==prev[k]))return;busy=true;try{const data=await loadAll(role);const cur=sRef.current;if(!data.__loadError&&!cur.modal&&!keysFor(role).some(k=>cur[k]!==before[k]))took(data);}catch(e){}finally{busy=false;}};const iv=setInterval(refresh,60000);window.addEventListener("focus",refresh);return()=>{clearInterval(iv);window.removeEventListener("focus",refresh);};},[authed,loading,role]);
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),60000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(s.toast){const t=setTimeout(()=>d({type:"TOAST",d:null}),s.toast.undo?5000:s.toast.long?6500:2200);return()=>clearTimeout(t);}},[s.toast]);
  // A new view starts at the top of the page.
  useEffect(()=>{window.scrollTo(0,0);},[s.tab]);
  // Windows (modals): Escape steps back or closes; the keyboard focus moves into the window when it opens,
  // can't wander behind it, and goes back where it was when it closes.
  const lastFocus=useRef(null);
  useEffect(()=>{if(!s.modal){const el=lastFocus.current;lastFocus.current=null;if(el&&el.focus&&document.contains(el))el.focus({preventScroll:true});return;}
    if(!lastFocus.current){const a=document.activeElement;lastFocus.current=a&&a!==document.body?a:null;}
    const id=requestAnimationFrame(()=>{const m=document.querySelector(".rc-mod");if(!m)return;const t=m.querySelector(".rc-mt");if(t){t.id="rc-mtitle";m.setAttribute("aria-labelledby","rc-mtitle");}if(!m.contains(document.activeElement))m.focus({preventScroll:true});});
    return()=>cancelAnimationFrame(id);},[s.modal,s.md]);
  useEffect(()=>{const onKey=e=>{const cur=sRef.current;if(e.key!=="Escape"||!cur.modal||e.defaultPrevented)return;e.preventDefault();d({type:(cur.mstack||[]).length?"BACK":"CLOSE"});};
    const onIn=e=>{if(!sRef.current.modal)return;const m=document.querySelector(".rc-mod");if(m&&!m.contains(e.target)&&!(e.target.closest&&e.target.closest(".rc-toast")))m.focus({preventScroll:true});};
    document.addEventListener("keydown",onKey);document.addEventListener("focusin",onIn);return()=>{document.removeEventListener("keydown",onKey);document.removeEventListener("focusin",onIn);};},[]);
  const TABL={overview:"Overview",inventory:"Engines",shop3d:"Shop 3D",parts:"Parts",boms:"BOM",social:"Marketing",services:"Services",prospects:"Prospects",competitors:"Competitors",issues:"Issues",ecm:"ECM",customers:"Customers & Jobs",operations:"Operations",schedule:"Schedule",quotes:"Quotes",invoices:"Invoicing",employees:"Team",reports:"Reports"};
  const NAV=[{t:"overview",i:"home"},{h:"Shop"},{t:"inventory",i:"eng"},{t:"shop3d",i:"shop"},{t:"boms",i:"clip"},{t:"parts",i:"box"},{t:"issues",i:"wrench"},{t:"ecm",i:"chip"},{h:"Sales"},{t:"social",i:"mega"},{t:"prospects",i:"target"},{t:"competitors",i:"flag"},{t:"services",i:"tag"},{t:"quotes",i:"doc"},{t:"invoices",i:"cash"},{h:"Operations"},{t:"customers",i:"users"},{t:"operations",i:"truck"},{t:"schedule",i:"cal"},{h:"Business"},{t:"employees",i:"team"},{t:"reports",i:"chart"}];
  const splash=(<div className="rc-root" data-theme={theme} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div className="rc-hi" style={{width:50,height:50,fontSize:24,margin:"0 auto 12px"}}>RC</div><div style={{fontFamily:"var(--fd)",fontSize:17.5,letterSpacing:2,textTransform:"uppercase",color:"var(--tx2)"}}>Loading...</div></div></div>);
  const toastEl=s.toast&&(<div role="status" className="rc-toast" style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"var(--tx)",border:"none",borderLeft:"3px solid var(--ac)",borderRadius:10,padding:"11px 16px",display:"flex",alignItems:"center",gap:14,zIndex:9999,boxShadow:"var(--sh2)",fontFamily:"var(--fb)",fontSize:14,color:"var(--bg)",maxWidth:"calc(100vw - 32px)"}}><span>{s.toast.msg}</span>{s.toast.undo&&<button className="rc-bs" onClick={()=>d({type:"UNDO"})} style={{fontSize:13,color:"var(--act)",borderColor:"var(--ac)",background:"transparent"}}>↩ Undo</button>}</div>);
  if(usingCloud&&!authReady)return splash;
  if(usingCloud&&!session)return <Login onAuthed={setSession} theme={theme}/>;
  if(usingCloud&&role==="none")return (<div className="rc-root" data-theme={theme} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}><style>{CSS}</style><div style={{textAlign:"center",maxWidth:360}}><div className="rc-hi" style={{width:50,height:50,fontSize:24,margin:"0 auto 12px"}}>RC</div><div style={{fontSize:14.5,color:"var(--tx2)",marginBottom:16,lineHeight:1.6}}>This login doesn't have access yet. Ask the owner to set it up from the Team tab.</div><button className="rc-bs" onClick={leave}>Sign out</button></div></div>);
  if(usingCloud&&loadErr)return (<div className="rc-root" data-theme={theme} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}><style>{CSS}</style><div style={{textAlign:"center",maxWidth:360}}><div className="rc-hi" style={{width:50,height:50,fontSize:24,margin:"0 auto 12px"}}>RC</div><div style={{fontFamily:"var(--fd)",fontSize:19,letterSpacing:1,textTransform:"uppercase",color:"var(--r)",marginBottom:8}}>Couldn't reach the server</div><div style={{fontSize:14,color:"var(--tx2)",marginBottom:16,lineHeight:1.6}}>Your shop data didn't load, so editing is paused to protect it — nothing will be saved over your cloud data until a clean load succeeds. Check your connection and retry.</div><button className="rc-ba" onClick={()=>window.location.reload()}>↻ Retry</button></div></div>);
  if(loading)return splash;
  // An employee login, or the owner looking at an employee's screen: their timesheet and nothing else.
  if(isEmployee||(preview&&preview.emp)){
    if(isEmployee&&!empId)return (<div className="rc-root" data-theme={theme} style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}><style>{CSS}</style><div style={{textAlign:"center",maxWidth:360}}><div className="rc-hi" style={{width:50,height:50,fontSize:24,margin:"0 auto 12px"}}>RC</div><div style={{fontSize:14.5,color:"var(--tx2)",marginBottom:16,lineHeight:1.6}}>This login isn't linked to a team member yet. Ask the owner to set it up from the Team tab.</div><button className="rc-bs" onClick={leave}>Sign out</button></div></div>);
    const me=isEmployee?{id:empId,name:meta.name||""}:{id:preview.emp,name:preview.name};
    return (<div className="rc-root" data-theme={theme}><style>{CSS}</style>
      <EmployeeShell s={s} d={d} me={me} email={session&&session.user&&session.user.email} preview={!isEmployee} onExit={()=>setPreview(null)} onSignOut={leave} saveBadge={saveBadge} themePref={themePref} chooseTheme={chooseTheme}/>
      <Modals s={s} d={d} owner={false} who={{role:"employee"}}/>
      {toastEl}
    </div>);
  }
  return (<div className="rc-root" data-theme={theme}><style>{CSS}</style>
    <div className={"rc-shell"+(navOpen?" nav-open":"")}>
      <aside className="rc-side" aria-label="Main navigation">
        <div className="rc-logo"><div className="rc-hi">RC</div><div><div className="rc-hn">Rollin Coal</div><div className="rc-hs">Diesel Engine Specialists</div></div></div>
        <nav className="rc-navlist">{NAV.map((n,k)=>n.h?(<div key={"h"+k} className="rc-nsec">{n.h}</div>):(<button key={n.t} className={"rc-ni"+(s.tab===n.t?" on":"")} aria-current={s.tab===n.t?"page":undefined} onClick={()=>{d({type:"TAB",v:n.t});setNavOpen(false);}}><Ico n={n.i}/>{TABL[n.t]}</button>))}</nav>
        <div className="rc-sfoot">
          <div className="rc-seg" role="group" aria-label="Colour theme">{THEMES.map(([k,ic,l])=>(<button key={k} className={themePref===k?"on":""} aria-pressed={themePref===k} title={k==="auto"?"Follow this device's light/dark setting":l+" theme"} onClick={()=>chooseTheme(k)}><span aria-hidden="true">{ic}</span>{l}</button>))}</div>
          {usingCloud&&session&&<div className="rc-user"><span className="rc-dot"/><span>{session.user&&session.user.email}</span></div>}
          <div className="rc-links"><button className="rc-link" onClick={()=>exportBackup(s)} title="Download a JSON backup of all shop data">Backup</button>{!usingCloud&&<button className="rc-link" onClick={()=>d({type:"MODAL",v:"confirm-reset"})}>Reset</button>}{usingCloud&&session&&<button className="rc-link" onClick={()=>d({type:"MODAL",v:"my-password"})}>Password</button>}{usingCloud&&session&&<button className="rc-link" onClick={leave}>Sign out</button>}</div>
        </div>
      </aside>
      <div className="rc-scrim" onClick={()=>setNavOpen(false)}/>
      <main className="rc-main">
        <div className="rc-top">
          <button className="rc-menu" aria-label="Open the menu" onClick={()=>setNavOpen(true)}><Ico n="menu"/></button>
          <div style={{minWidth:0}}><h1 className="rc-pt">{TABL[s.tab]||"Overview"}</h1><div className="rc-psub">{time.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · Medicine Hat, AB</div></div>{preview==="staff"&&<button className="rc-fb on rc-ts-prevbar" onClick={()=>setPreview(null)}>👁 Previewing as staff · back to owner view</button>}{saveBadge}
        </div>
        <div className="rc-body">
      {s.tab==="overview"&&<Overview s={s} d={d} owner={ownerView}/>}
      {s.tab==="customers"&&<Customers s={s} d={d}/>}
      {s.tab==="services"&&<Services s={s} d={d}/>}
      {s.tab==="quotes"&&<Quotes s={s} d={d}/>}
      {s.tab==="inventory"&&<Inv s={s} d={d}/>}
      {s.tab==="shop3d"&&<Shop3D s={s} d={d} theme={theme} owner={ownerView}/>}
      {s.tab==="parts"&&<Parts s={s} d={d}/>}
      {s.tab==="boms"&&<Boms s={s} d={d}/>}
      {s.tab==="issues"&&<Issues s={s} d={d}/>}
{s.tab==="ecm"&&<Ecm s={s} d={d}/>}
      {s.tab==="invoices"&&<Invoicing s={s} d={d}/>}
      {s.tab==="operations"&&<Operations s={s} d={d}/>}
      {s.tab==="social"&&<Marketing s={s} d={d}/>}
{s.tab==="prospects"&&<Prospects s={s} d={d}/>}
{s.tab==="competitors"&&<Competitors s={s} d={d}/>}
      {s.tab==="schedule"&&<Schedule s={s} d={d}/>}
      {s.tab==="employees"&&<Emps s={s} d={d} role={role} owner={ownerView} preview={preview} setPreview={setPreview}/>}
      {s.tab==="reports"&&<Reports s={s} owner={ownerView}/>}
        </div>
      </main>
    </div>
    <Modals s={s} d={d} owner={ownerView} who={{role:ownerView?"owner":"staff"}}/>
    {s.soldSplash&&(()=>{const w=s.soldSplash;const m=(+w.price||0)-(+w.cost||0);const soundOn=getSet(s).soundOn!==false;return(<div className="rc-splash" onClick={()=>d({type:"SPLASH",d:null})}>
      <button className="rc-bs rc-splash-mute" onClick={e=>{e.stopPropagation();const cur=(s.settings||[])[0];if(cur)d({type:"UPDATE",list:"settings",id:cur.id,d:{soundOn:!soundOn}});else d({type:"ADD",list:"settings",d:{soundOn:!soundOn},label:soundOn?"Horn muted":"Horn on"});}}>{soundOn?"🔊":"🔇"}</button>
      <div className="rc-splash-in">
        <div className="rc-stamp">SOLD</div>
        <div className="rc-spl-name">{w.name}</div>
        <div className="rc-spl-price">{$$(w.price)}</div>
        {w.cost>0?(<div className="rc-spl-margin">+{$$(m)} margin · {w.price>0?Math.round(m/w.price*100):0}%</div>):(<div className="rc-spl-margin dim">enter cost basis to see the true margin</div>)}
        <div style={{marginTop:16}} onClick={e=>e.stopPropagation()}><div style={{fontSize:11,color:"var(--tx2)",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Buyer came from</div><div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{SALE_SRC.map(([k,l])=>(<button key={k} className="rc-bs" style={w.src===k?{borderColor:"var(--g)",color:"var(--g)",background:"var(--gs)"}:{}} onClick={()=>{d({type:"UPDATE",list:"wins",id:w.id,d:{src:k}});d({type:"SPLASH",d:{...w,src:k}});}}>{l}</button>))}</div></div>
        <div className="rc-spl-note">Logged to Wins · tap anywhere to dismiss</div>
      </div></div>);})()}
    {toastEl}
  </div>);
}
