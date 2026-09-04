// Smoke test: localStorage mode, walks the new diagnosis + issues features.
import { chromium } from "playwright";
import { spawn } from "child_process";
const srv=spawn("npx",["vite","preview","--port","4173","--strictPort"],{stdio:"ignore"});
await new Promise(r=>setTimeout(r,2500));
const errs=[];
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}).catch(()=>chromium.launch());
const p=await b.newPage({viewport:{width:1280,height:900}});
p.on("pageerror",e=>errs.push("pageerror: "+e.message));
p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
await p.goto("http://localhost:4173/");
await p.waitForSelector("nav.rc-nav");
// Issues tab
await p.click("nav.rc-nav >> text=Issues");
await p.waitForSelector("text=Common Issues");
await p.screenshot({path:"shot-issues.png",fullPage:false});
const rows=await p.locator("table.rc-tbl tbody tr").count();
console.log("issues rows:",rows);
// filter by model ISX15
await p.click("button.rc-fb:has-text('ISX15')");
const isx=await p.locator("table.rc-tbl tbody tr").count();
console.log("ISX15 rows:",isx);
// open engine passport for an ISX-15
await p.click("nav.rc-nav >> text=Inventory");
await p.fill("input.rc-si","ISX-15 (2010)");
await p.click("table.rc-tbl tbody tr >> nth=0 >> td >> nth=1");
await p.waitForSelector("text=Diagnosis history");
const known=await p.locator("text=/known issues? for/").innerText();
console.log("passport:",known);
await p.screenshot({path:"shot-passport.png"});
// log a diagnosis
await p.click(".rc-mod button:has-text('+ Log Diagnosis')");
await p.waitForSelector("text=Log Diagnosis");
await p.click("button.rc-fb:has-text('Hard start')");
await p.click("button.rc-fb:has-text('Low power')");
await p.waitForSelector("text=matching known issue");
await p.fill("input[placeholder^='Fault codes']","SPN 157 FMI 18");
await p.fill("textarea[placeholder^='Findings']","Metal in fuel filter, rail pressure low vs commanded.");
await p.fill("textarea[placeholder^='Fix']","XPI pump + injectors, flushed rails.");
await p.fill("input[placeholder='Hours']","3");
await p.fill("input[placeholder='Rate ($/hr)']","120");
await p.click(".rc-mod button:has-text('+ Part')");
await p.fill("input[placeholder='Part']","XPI pump");
await p.fill("input[placeholder='$']","2400");
await p.screenshot({path:"shot-dxform.png"});
await p.click(".rc-fa button.rc-ba:has-text('Save')");
await p.waitForSelector("text=Engine Unit Record");
const cb=await p.locator("text=Total in this engine").locator("xpath=..").innerText();
console.log("cost basis line:",cb.replace(/\s+/g," "));
const dxParts=await p.locator("text=Diagnosis parts").count();
console.log("diagnosis parts row present:",dxParts>0);
await p.screenshot({path:"shot-passport2.png"});
// open diagnosis detail → add to common issues
await p.click("text=Hard start, Low power");
await p.waitForSelector("text=Add to common issues");
await p.click(".rc-mod button:has-text('Add to common issues')");
await p.waitForSelector("text=Add Common Issue");
const title=await p.inputValue("input[placeholder^='Title']");
const models=await p.inputValue("input[placeholder^='Engine models']");
console.log("prefill title:",title,"| models:",models);
await p.click(".rc-fa button.rc-ba:has-text('Save')");
await p.waitForSelector("text=Linked common issue");
await p.screenshot({path:"shot-dxdetail.png"});
await p.keyboard.press("Escape");
await p.click(".rc-ov",{position:{x:5,y:5}}).catch(()=>{});
await p.waitForTimeout(1500);
// reload → persisted?
await p.reload();
await p.waitForSelector("nav.rc-nav");
await p.click("nav.rc-nav >> text=Issues");
await p.click("button.rc-fb:has-text('Diagnosis Log')");
const logRows=await p.locator("table.rc-tbl tbody tr").count();
console.log("diagnosis log rows after reload:",logRows);
await p.screenshot({path:"shot-log.png"});
const shopIssues=await p.locator("text=/1 from this shop/").count();
console.log("shop-sourced issue counted:",shopIssues>0);
await p.click("table.rc-tbl tbody tr >> nth=0 >> td >> nth=3");await p.waitForSelector("text=Diagnosis");console.log("linked issue survives reload:",await p.locator("text=Linked common issue").count()>0);
console.log("errors:",errs.length?errs:"none");
await b.close();srv.kill();process.exit(0);
