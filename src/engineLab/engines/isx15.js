// Cummins ISX15 (CM2350 era): 14.9 L inline-six, 137 × 169 mm, XPI common rail, single overhead cam,
// VGT turbo, cooled EGR. The engine definition for the Engine Lab (src/engineLab/core.js): what it is,
// its parts and systems, the build sequence, how each part is drawn (builders) and what turns (spin).
// 1 scene unit = 100 mm; cylinder 1 at the front (+X).

export const meta={
  id:'isx15', mark:'ISX15', name:'Cummins ISX15', maker:'Cummins',
  sub:'14.9 L inline-six · 137 × 169 mm · XPI common rail · VGT turbo · cooled EGR',
  overview:'Heavy-duty 15-litre inline-six',
  specs:[['Displacement','14.9 L (912 cu in)'],['Layout','Inline 6, 4 valves/cyl'],['Bore × stroke','137 × 169 mm'],['Firing order','1-5-3-6-2-4'],['Valvetrain','Single overhead cam'],['Fuel','XPI high-pressure common rail'],['Air','VGT turbo + charge air cooler'],['Emissions','Cooled EGR + aftertreatment'],['Retarder','Integrated compression brake'],['Ratings','400–600 hp, up to 2,050 lb-ft']],
  manual:'the Cummins service manual (QuickServe) for your ESN',
  hud:{boost:'Boost ≈',rail:'Rail ≈',railVal:k=>(700+k*1500).toFixed(0)+' bar'},
};
export const geo={S:1.7, R:0.845, L:2.6, DECK:4.36, PH:[0,480,240,600,120,360], FIRING:[1,5,3,6,2,4], IN_PEAK:465, EX_PEAK:255, stroke:0.169};

export const SYS={
  struct:{name:'Block & housings',c:'#bdb3a6'},
  rot:{name:'Rotating assembly',c:'#ff8a3d'},
  valve:{name:'Valvetrain',c:'#c7e06a'},
  fuel:{name:'Fuel system (XPI)',c:'#ffd23f'},
  air:{name:'Air & turbo',c:'#5aa9ff'},
  exh:{name:'Exhaust',c:'#ff5d4d'},
  egr:{name:'EGR',c:'#b48cff'},
  cool:{name:'Cooling',c:'#3fd6b0'},
  lube:{name:'Lubrication',c:'#e3a35b'},
  acc:{name:'Accessory drive',c:'#9db3c7'},
  elec:{name:'Electrical & controls',c:'#ff7bc8'},
};

/* ================= PARTS: name, function, mechanism =================
   a = label anchor (assembled), ex = explode offset, cut = how it behaves in cutaway */
export const P=[
 {id:'block',s:'struct',n:'Cylinder block',a:[-2.6,2.5,1.3],ex:[0,0,0],cut:'clip',
  fn:"The backbone of the engine. It carries the six cylinders, supports the crankshaft in its main bores, and contains the coolant jackets and oil galleries every other system depends on.",
  mech:"A single iron casting. Pressurised oil travels through drilled galleries to every main bearing, and coolant flows around the wet liners. The top (deck) is machined flat so one head gasket can seal combustion, coolant and oil at the same time."},
 {id:'bearings',s:'rot',n:'Main & rod bearings',a:[0.85,-0.5,0.2],ex:[0,-1.6,0],
  fn:"Thin, replaceable steel-backed shells that the crank journals and rod big ends turn on.",
  mech:"Hydrodynamic lubrication: the spinning journal drags oil into a wedge-shaped film so metal never touches metal while running. One main bearing carries thrust flanges that limit crankshaft end play."},
 {id:'crankshaft',s:'rot',n:'Crankshaft',a:[-0.85,-1.0,0.9],ex:[0,-3.2,0],
  fn:"Turns the straight-line push of six pistons into rotation at the flywheel.",
  mech:"Six crankpins in three pairs (1 & 6, 2 & 5, 3 & 4) spaced 120° apart, so a cylinder fires every 120° of rotation in the order 1-5-3-6-2-4. Counterweights opposite each throw balance the rotating mass. Forged steel with hardened journals."},
 {id:'mainCaps',s:'struct',n:'Main bearing caps',a:[2.55,-0.7,0.6],ex:[0,-4.6,0],
  fn:"Clamp the crankshaft into the block.",
  mech:"Each cap is machined together with the block (line-bored), so caps are numbered and fit only one position and one direction. Bolt clamp load holds the bearing shells in 'crush' so they cannot spin."},
 {id:'liners',s:'struct',n:'Cylinder liners (wet)',a:[-4.25,3.1,0.8],ex:[0,3.2,0],cut:'clip',
  fn:"Replaceable cylinder walls that the pistons slide in.",
  mech:"Wet liners: coolant touches the outside of the liner directly for strong heat transfer, and O-rings keep coolant out of the crankcase. The top flange sits in a counterbore and stands slightly proud of the deck so the head gasket clamps it."},
 {id:'pistons',s:'rot',n:'Pistons',a:[4.25,4.5,0.3],ex:[0,5.6,0],
  fn:"Seal the bottom of the combustion chamber and pass cylinder pressure to the connecting rod.",
  mech:"One-piece steel pistons with a re-entrant bowl in the crown. The bowl shape swirls the injected fuel into the air for clean, fast burning. Oil jets under the piston cool the crown."},
 {id:'rings',s:'rot',n:'Piston rings',a:[2.55,3.95,0.7],ex:[0,6.4,0],
  fn:"Seal compression, control oil, and carry heat from the piston into the liner.",
  mech:"The top compression ring takes most of the gas load. The second ring finishes sealing and scrapes oil down. The oil control ring leaves a thin film on the liner wall and returns the rest through drain holes."},
 {id:'wristPins',s:'rot',n:'Piston (wrist) pins',a:[0.85,3.3,0.6],ex:[0,5.6,1.8],
  fn:"The pivot joint between piston and connecting rod.",
  mech:"Full-floating pin: free to turn in both the piston bosses and the rod's small-end bushing. Retaining rings stop it sliding out against the liner."},
 {id:'rods',s:'rot',n:'Connecting rods',a:[-2.55,1.7,0.5],ex:[0,1.0,3.6],
  fn:"Link each piston to its crankpin.",
  mech:"A slider-crank: the rod angle swings as the crank turns, turning straight-line force into torque. Torque is greatest around 70–90° after top dead centre, where the rod has the most leverage. The big-end cap is fracture-split, so it only fits its own rod."},
 {id:'flywheel',s:'rot',n:'Flywheel & ring gear',a:[-6.3,-1.3,1.3],ex:[-3.8,0,0],
  fn:"Stores energy to smooth out the gaps between power strokes, carries the starter ring gear, and mounts the clutch.",
  mech:"Its inertia resists speed changes. It absorbs energy on each power stroke and gives it back while the other cylinders are compressing."},
 {id:'flywheelHousing',s:'struct',n:'Flywheel housing & rear seal',a:[-5.8,2.4,1.4],ex:[-2.2,0,0],cut:'clip',
  fn:"Encloses the flywheel, bolts the transmission to the engine, and holds the starter and rear crankshaft seal.",
  mech:"The bore and face must run true to the crankshaft centreline so the transmission input shaft lines up. Both are checked with a dial indicator."},
 {id:'damper',s:'rot',n:'Viscous vibration damper',a:[6.1,-1.15,0.5],ex:[6.0,0,0],
  fn:"Controls crankshaft torsional vibration.",
  mech:"A heavy inertia ring floats in silicone fluid inside a sealed housing. When the crankshaft twists back and forth, the fluid shears and turns that vibration into heat. A dented damper must be replaced because the ring can bind."},
 {id:'gearTrain',s:'rot',n:'Front gear train',a:[5.5,1.4,0.9],ex:[3.4,0,0],
  fn:"Drives the camshaft and gear-driven accessories in exact time with the crankshaft.",
  mech:"Crank gear → lower idler → upper idler → camshaft gear. Idlers change only direction and distance, not timing. Timing marks on the gears set valve and injection-system timing."},
 {id:'camGear',s:'valve',n:'Camshaft gear',a:[5.5,6.8,0.9],ex:[3.4,11.6,0.6],
  fn:"Turns the overhead camshaft at exactly half crankshaft speed.",
  mech:"It has twice the teeth of the crank gear (32 vs 16 here), so the cam makes one turn for every two crank turns: one complete four-stroke cycle. Its timing mark lines up with the idler mark at cylinder 1 top dead centre."},
 {id:'gearHousing',s:'struct',n:'Front gear housing',a:[5.3,4.2,-1.2],ex:[2.2,0,0],cut:'clip',
  fn:"Locates the gear train shafts and closes off the front of the block.",
  mech:"Dowel-located to the block so idler shafts hold the correct gear centre distance, which sets backlash."},
 {id:'frontCover',s:'struct',n:'Front gear cover & seal',a:[5.75,3.0,1.5],ex:[4.8,0,0],cut:'clip',
  fn:"Covers the gear train and holds the front crankshaft seal.",
  mech:"The lip seal rides on the crankshaft or damper hub. Correct installed depth and a clean, undamaged sealing surface are what keep it dry."},
 {id:'oilPan',s:'lube',n:'Oil pan (sump)',a:[1.5,-2.4,1.4],ex:[0,-6.9,0],cut:'clip',
  fn:"The engine oil reservoir and the lower seal of the crankcase.",
  mech:"Oil drains back here from the whole engine. The deep sump and baffles keep the pickup covered when the truck brakes, climbs or descends."},
 {id:'headGasket',s:'struct',n:'Cylinder head gasket',a:[2.2,4.4,1.3],ex:[0,7.2,0],cut:'clip',
  fn:"Seals combustion gas, coolant and oil between block and head.",
  mech:"Multi-layer steel with embossed beads that concentrate clamping force around each bore and passage. It only seals if the liners stand proud by the right amount and the bolts are torqued correctly."},
 {id:'head',s:'struct',n:'Cylinder head',a:[-1.0,5.3,1.33],ex:[0,8.2,0],cut:'clip',
  fn:"Closes the top of the cylinders and holds the valves, injectors and camshaft.",
  mech:"One-piece cross-flow head: air enters on the intake side and exhaust leaves on the opposite side. Coolant passages surround the valve seats and injector bores, which are the hottest areas."},
 {id:'valveCover',s:'struct',n:'Valve (rocker) cover',a:[-2.0,7.3,0.3],ex:[0,15.5,0],cut:'clip',
  fn:"Seals the top of the engine over the camshaft, rockers, injectors and engine brake.",
  mech:"An isolated cover: rubber isolators and the gasket keep engine vibration from reaching the cover, which cuts noise and stops gasket fretting. Oil sprayed inside lubricates the valvetrain and drains back to the pan."},
 {id:'valves',s:'valve',n:'Intake & exhaust valves',a:[2.9,4.55,0.3],ex:[0,7.4,0],
  fn:"Open and close the ports: two intake and two exhaust valves per cylinder, 24 in total.",
  mech:"Poppet valves. Spring force holds them shut on hardened seats, and the cam pushes them open through the rocker and crosshead. Exhaust valves use heat-resistant alloy because they sit in the hottest gas."},
 {id:'springs',s:'valve',n:'Valve springs & retainers',a:[0.52,5.95,0.3],ex:[0,8.9,0],
  fn:"Close the valves and keep the valvetrain following the cam profile.",
  mech:"Spring preload has to overcome valvetrain inertia at governed speed. If it doesn't, the valve 'floats' and can hit the piston. Split collets lock the retainer to the valve stem."},
 {id:'crossheads',s:'valve',n:'Crossheads (valve bridges)',a:[-1.18,6.2,0.36],ex:[0,9.8,0],
  fn:"Let one rocker lever open two valves at once.",
  mech:"A bridge across the two valve stems: the rocker presses the middle and both valves open evenly. The small gap between the rocker and crosshead is the valve lash."},
 {id:'camshaft',s:'valve',n:'Overhead camshaft',a:[3.0,6.3,0.9],ex:[0,11.6,0.6],
  fn:"Times every valve event on the engine.",
  mech:"Single overhead cam. Each lobe has a base circle (valve shut) and a nose (valve open). The lobe shape sets when a valve opens, how far, and for how long. Here intake and exhaust lobes are about 240 crank degrees long, with overlap around top dead centre."},
 {id:'rockers',s:'valve',n:'Rocker levers & shaft',a:[-2.9,6.65,0.45],ex:[0,12.6,0],
  fn:"Carry cam lift across to the valves.",
  mech:"Roller-follower levers pivot on a shaft. When the lobe lifts the roller, the other arm presses the crosshead down and the valves open. An adjusting screw and locknut set the lash."},
 {id:'brake',s:'valve',n:'Integrated engine brake',a:[-4.0,7.0,0.45],ex:[0,13.6,0],
  fn:"A compression brake that slows the truck without using the service brakes.",
  mech:"When the brake is switched on, oil pressure activates a mechanism that opens the exhaust valves near top dead centre on the compression stroke. The compressed air escapes, so the energy used to compress it is lost and the engine absorbs power."},
 {id:'fuelPump',s:'fuel',n:'High-pressure fuel pump',a:[4.2,2.4,-1.9],ex:[0,-0.6,-3.4],
  fn:"Generates the very high pressure that the common rail stores.",
  mech:"A gear transfer pump draws fuel from the tank through the filters, and engine-driven pistons compress it. An ECM-controlled inlet metering valve sets how much fuel reaches the pistons, which is how rail pressure is controlled."},
 {id:'fuelRail',s:'fuel',n:'Common rail (accumulator)',a:[-1.0,4.1,-1.6],ex:[0,0,-3.2],
  fn:"Stores fuel at injection pressure for all six injectors.",
  mech:"Because pressure is stored, injection pressure and timing don't depend on engine speed. Pressure reaches roughly 2,000+ bar (30,000+ psi). A sensor reports it to the ECM and a relief valve protects the system."},
 {id:'hpLines',s:'fuel',n:'High-pressure fuel lines',a:[2.55,4.3,-1.55],ex:[0,0,-2.4],
  fn:"Carry fuel from pump to rail, and from rail to each cylinder.",
  mech:"Thick-wall steel lines with formed ends. Fuel at rail pressure can pierce skin, so never loosen a line or look for leaks by hand on a running engine."},
 {id:'connectors',s:'fuel',n:'Fuel connectors',a:[-2.55,4.7,-1.4],ex:[0,8.2,-2.2],
  fn:"Feed high-pressure fuel sideways through the head into each injector.",
  mech:"The connector tip seats against the injector inlet and its retaining nut clamps it. A burred or dirty seat leaks rail pressure inside the head."},
 {id:'injectors',s:'fuel',n:'XPI fuel injectors',a:[0.85,6.2,0],ex:[0,10.6,0],
  fn:"Spray a precisely measured fuel charge into each cylinder.",
  mech:"The ECM energises a solenoid that opens a control valve. Pressure above the needle drops, and rail pressure lifts the needle so fuel sprays through micro-holes. Several injections per cycle (pilot, main, post) are possible."},
 {id:'fuelFilter',s:'fuel',n:'Fuel filter & water separator',a:[-1.0,-0.4,-2.15],ex:[0,-1.5,-3.6],
  fn:"Removes dirt and water before fuel reaches the pump.",
  mech:"Common-rail parts have clearances measured in microns, so filtration is critical. Water is heavier than diesel, so it settles in the bowl for draining."},
 {id:'intakeManifold',s:'air',n:'Intake manifold',a:[1.7,5.55,-1.6],ex:[0,8.2,-2.6],
  fn:"Distributes charge air, mixed with cooled EGR gas, evenly to all six cylinders.",
  mech:"Boosted air from the charge air cooler enters at the front and feeds each intake port. Pressure and temperature are measured here for fuelling."},
 {id:'intakeConnection',s:'air',n:'Intake air connection & EGR mixer',a:[5.1,5.65,-1.65],ex:[1.5,8.2,-2.6],
  fn:"The air inlet at the front of the intake manifold, where cooled EGR gas joins fresh charge air.",
  mech:"The mixer blends the two flows so every cylinder gets the same EGR rate."},
 {id:'exhaustManifold',s:'exh',n:'Exhaust manifold (3-piece)',a:[3.0,5.3,1.95],ex:[0,8.2,2.6],cut:'ghost',
  fn:"Collects exhaust from all six cylinders and feeds it to the turbine.",
  mech:"Built in three sections with slip joints so it can grow with heat (several hundred °C) without cracking or snapping studs."},
 {id:'turbine',s:'exh',n:'VGT turbine housing & wheel',a:[-0.4,6.2,3.25],ex:[0,8.2,4.6],cut:'ghost',
  fn:"Recovers energy from the exhaust to drive the compressor.",
  mech:"Hot exhaust expands through the turbine wheel and spins the shaft. A variable-geometry nozzle changes the flow area: narrow at low speed for quick boost, wide at high speed to prevent overspeed."},
 {id:'chra',s:'air',n:'Turbo centre (bearing) housing',a:[0.12,5.05,3.3],ex:[0,8.2,5.4],cut:'ghost',
  fn:"Holds the bearings that carry the turbo shaft.",
  mech:"Engine oil floats the shaft on thin oil films at tens of thousands of rpm, then drains back to the crankcase by gravity. A few seconds without oil can destroy it."},
 {id:'compressor',s:'air',n:'Turbo compressor',a:[0.8,5.0,3.45],ex:[0,8.2,6.2],cut:'ghost',
  fn:"Packs more air into the cylinders (boost).",
  mech:"The compressor wheel shares a shaft with the turbine. It flings air outward into the volute, which turns speed into pressure. Compression heats the air, so it goes through the charge air cooler before reaching the engine."},
 {id:'vgt',s:'air',n:'VGT actuator',a:[-0.4,6.6,2.95],ex:[0,9.2,4.6],cut:'ghost',
  fn:"Moves the variable-geometry mechanism when the ECM commands it.",
  mech:"An electric actuator positions the turbine nozzle to control boost. Closing it also raises exhaust back pressure, which pushes EGR gas into the intake and helps engine braking."},
 {id:'chargePipes',s:'air',n:'Air inlet & charge-air pipes',a:[4.0,6.95,2.65],ex:[0,8.2,7.2],cut:'ghost',
  fn:"Plumbing from the air cleaner to the turbo, from the turbo to the charge air cooler, and back to the intake.",
  mech:"Hot boosted air leaves the compressor, cools in the chassis-mounted charge air cooler, then returns denser to the intake connection. A leak lowers boost and raises exhaust temperature."},
 {id:'exhaustOutlet',s:'exh',n:'Exhaust outlet',a:[-2.2,3.3,3.05],ex:[-1.5,6.0,5.0],cut:'ghost',
  fn:"Carries exhaust from the turbine to the aftertreatment system.",
  mech:"Downstream (not shown) the DOC burns hydrocarbons and CO, the DPF traps soot, and SCR with DEF converts NOx into nitrogen and water."},
 {id:'egrCooler',s:'egr',n:'EGR cooler',a:[0.5,6.55,-1.85],ex:[0,9.4,-3.4],
  fn:"Cools recirculated exhaust gas before it re-enters the engine.",
  mech:"Exhaust runs through tubes surrounded by engine coolant. Cooler, denser EGR gas lowers peak combustion temperature, and that cuts NOx formation."},
 {id:'egrValve',s:'egr',n:'EGR valve',a:[3.35,6.5,-1.85],ex:[1.0,9.4,-3.4],
  fn:"Meters how much exhaust gas is recirculated.",
  mech:"An ECM-controlled valve. When it opens, exhaust back pressure (set largely by the VGT) pushes gas into the intake. The ECM closes it when EGR isn't wanted."},
 {id:'egrTube',s:'egr',n:'EGR crossover tube',a:[-5.55,7.65,0.3],ex:[-2.0,9.0,0],cut:'ghost',
  fn:"Carries hot exhaust from the exhaust manifold over the engine to the EGR cooler.",
  mech:"Stainless tube with flexible bellows sections that absorb thermal growth."},
 {id:'waterPump',s:'cool',n:'Water pump',a:[6.1,2.4,-1.3],ex:[6.4,0,-0.6],
  fn:"Circulates coolant through the block, head, oil cooler and EGR cooler.",
  mech:"A belt-driven centrifugal impeller. Flow rises with engine speed."},
 {id:'thermostat',s:'cool',n:'Thermostat housing',a:[5.45,5.55,-1.1],ex:[3.0,8.2,-0.6],
  fn:"Keeps the engine at operating temperature.",
  mech:"A wax-pellet thermostat. When coolant reaches its rated temperature the wax melts and expands, opening the path to the radiator. Until then coolant bypasses straight back to the pump so the engine warms up quickly."},
 {id:'oilPump',s:'lube',n:'Oil pump & pickup',a:[4.0,-1.2,0.5],ex:[0,-6.0,0],
  fn:"Pressurises the lubrication system.",
  mech:"A gear-driven positive-displacement pump pulls oil through the pickup screen. A regulator valve limits pressure and sends the excess back to the pan."},
 {id:'oilCooler',s:'lube',n:'Oil cooler',a:[1.8,1.7,-1.75],ex:[0,0,-2.6],
  fn:"Uses engine coolant to remove heat from the oil.",
  mech:"A plate-type heat exchanger: oil and coolant flow through alternating passages."},
 {id:'oilFilter',s:'lube',n:'Oil filter',a:[1.4,-0.45,-2.1],ex:[0,-1.5,-3.2],
  fn:"Cleans the oil before it reaches the bearings.",
  mech:"A spin-on filter. If it plugs, a bypass valve still lets oil through so the bearings are never starved, though that oil is unfiltered."},
 {id:'fan',s:'cool',n:'Fan hub & fan',a:[6.75,5.7,0],ex:[8.6,0,0],cut:'ghost',
  fn:"Pulls air through the radiator and charge air cooler.",
  mech:"A clutch in the hub engages the fan only when cooling is needed, which saves horsepower and fuel."},
 {id:'alternator',s:'elec',n:'Alternator',a:[5.2,1.5,2.25],ex:[6.0,0,2.0],cut:'ghost',
  fn:"Charges the batteries and powers the truck's electrics.",
  mech:"Belt-driven. A spinning magnetic field induces AC in the stator windings, and diodes rectify it to DC."},
 {id:'belt',s:'acc',n:'Belt & automatic tensioner',a:[6.25,0.95,1.0],ex:[7.0,0,0],
  fn:"Drives the fan, water pump and alternator from the crank pulley.",
  mech:"A poly-V serpentine belt. The spring-loaded tensioner keeps tension constant as the belt wears and stretches."},
 {id:'airCompressor',s:'acc',n:'Air brake compressor',a:[4.1,3.25,1.85],ex:[0,0,3.2],cut:'ghost',
  fn:"Supplies compressed air for the truck's air brakes and suspension.",
  mech:"A gear-driven piston compressor. A governor tells it when to pump and when to unload."},
 {id:'starter',s:'elec',n:'Starter motor',a:[-4.4,0.55,2.15],ex:[-2.4,0,2.6],cut:'ghost',
  fn:"Cranks the engine for starting.",
  mech:"An electric motor. The solenoid pushes the pinion into the flywheel ring gear, then closes the high-current contacts."},
 {id:'ecm',s:'elec',n:'Engine control module (ECM)',a:[-3.0,3.65,-1.5],ex:[0,0,-3.8],
  fn:"The engine's computer. It controls fuelling, injection timing, rail pressure, the VGT, EGR and the engine brake.",
  mech:"It reads every sensor many times per revolution, calculates injection quantity and timing, and fires the injectors. Fuel flowing through its cooling plate keeps the electronics cool."},
 {id:'crankSensor',s:'elec',n:'Crankshaft position sensor',a:[-5.6,2.9,0.6],ex:[-3.0,0.8,0.8],cut:'ghost',
  fn:"Tells the ECM crankshaft speed and exact position.",
  mech:"A magnetic pickup reads a toothed tone wheel. A gap in the tooth pattern marks a reference point, so the ECM knows where every piston is."},
 {id:'camSensor',s:'elec',n:'Camshaft position sensor',a:[5.9,6.85,1.6],ex:[5.4,0,0.4],
  fn:"Tells the ECM which part of the 720° cycle the engine is in.",
  mech:"Crank position alone can't tell compression from exhaust, because both happen at top dead centre. The cam signal resolves it, so the right injector fires."},
 {id:'imap',s:'elec',n:'Intake manifold pressure/temp sensor',a:[0.3,5.85,-1.6],ex:[0,8.8,-2.6],
  fn:"Measures boost pressure and charge-air temperature.",
  mech:"Lets the ECM calculate how much air is in the cylinders, then control boost, EGR and fuelling."},
 {id:'railSensor',s:'elec',n:'Rail pressure sensor',a:[-4.6,4.15,-1.5],ex:[-0.8,0,-3.2],
  fn:"Measures common-rail fuel pressure.",
  mech:"Closed-loop control: the ECM adjusts pump metering until measured rail pressure matches its target."},
 {id:'coolantSensor',s:'elec',n:'Coolant temperature sensor',a:[5.45,5.85,-0.6],ex:[3.0,8.8,-0.6],
  fn:"Measures engine coolant temperature.",
  mech:"A thermistor whose resistance changes with temperature. Used for fuelling, fan control and engine protection."},
 {id:'oilSensor',s:'elec',n:'Oil pressure sensor',a:[1.95,0.95,-1.9],ex:[0,-0.5,-3.0],
  fn:"Measures engine oil pressure.",
  mech:"Drives the gauge and engine protection: low oil pressure triggers a warning, derate or shutdown."},
 {id:'turboSensor',s:'elec',n:'Turbo speed sensor',a:[0.15,6.0,3.2],ex:[0,8.9,5.4],cut:'ghost',
  fn:"Measures turbocharger shaft speed.",
  mech:"Lets the ECM protect the turbo from overspeed, which matters most at high altitude."},
];


/* ================= BUILD PROCESS (out-of-frame build on a stand) ================= */
export const STEPS=[
 {t:'Prepare the cylinder block',p:['block'],why:"Everything locates off the block, so it is cleaned, inspected and measured before a single part goes on.",
  std:["Hot-tank or wash; blow out every oil gallery and coolant passage","Pressure-test for cracks","Check deck flatness with a straightedge and feeler gauge","Inspect main bores (line bore) and liner counterbores for damage and correct depth","Chase threads and fit new cup plugs"]},
 {t:'Upper main bearing shells',p:['bearings'],why:"Shells go in before the crank. Their positions and oil holes are only visible with the crank out.",
  std:["Shell backs and block bores clean and dry","Locating tangs seated in their notches; oil holes lined up with block feeds","Thrust bearing in its specified position","Lubricate bearing faces with clean engine oil"]},
 {t:'Crankshaft',p:['crankshaft'],why:"The crank sets the reference for every rotating and timing part that follows.",
  std:["Measure every journal for diameter, taper and out-of-round","Crack-check and inspect journal finish","Lower in level with a lifting fixture; never let a journal hit a shell edge"]},
 {t:'Main bearing caps',p:['mainCaps'],why:"Clamping the crank now lets you confirm it turns freely and has correct end play before anything else drags on it.",
  std:["Caps in numbered positions, arrows toward the front","Lubricate bolt threads and under the heads as the manual specifies","Torque in the specified sequence and stages, then angle-turn","Crank must turn by hand; measure end play with a dial indicator"]},
 {t:'Cylinder liners',p:['liners'],why:"Liner protrusion must be measured on the bare block. It decides whether the head gasket will seal.",
  std:["New liner O-rings and seals, lubricated only as the manual specifies","Press in with a liner driver; never hammer","Clamp down and measure protrusion at several points on each liner","Protrusion in spec and close to the neighbouring liners"]},
 {t:'Piston & rod assemblies',p:['pistons','rings','wristPins','rods'],why:"Pistons go in after the liners are set and before the head closes off the top.",
  std:["Check ring end gap in the liner","Fit rings with an expander, identification marks up, gaps staggered","New pin retaining rings, fully seated in their grooves","Piston orientation mark toward the front","Use a ring compressor and guide the rod onto the journal without nicking it","Each fracture-split cap stays with its own rod; torque then angle-turn; check side clearance"]},
 {t:'Front gear housing',p:['gearHousing'],why:"The housing carries the idler shafts, so it must be on and true before any gear goes in.",
  std:["Clean mating faces; apply the specified sealant bead","Seat on dowels; torque in sequence"]},
 {t:'Gear train',p:['gearTrain'],why:"Cylinder 1 is set at top dead centre now, and every later timing step references these marks.",
  std:["Crank gear and idlers fitted; idler shafts lubricated","Cylinder 1 at TDC with timing marks aligned","Measure backlash between each gear pair with a dial indicator"]},
 {t:'Oil pump & pickup',p:['oilPump'],why:"The pump mounts low in the crankcase and is only reachable before the pan goes on.",
  std:["Prime the pump with clean oil","New pickup seal; support brackets tight","Check drive gear backlash"]},
 {t:'Flywheel housing & rear seal',p:['flywheelHousing'],why:"The rear seal and housing must be on before the flywheel can be fitted.",
  std:["Sealant on the mating face as specified","Install the new rear seal to the correct depth with the installer tool","Dial-indicate housing bore and face runout to the crankshaft"]},
 {t:'Flywheel',p:['flywheel'],why:"Fitted once the housing is aligned, so runout can be measured against a true reference.",
  std:["Clean the crank flange and flywheel bore","New capscrews if specified; torque in a cross pattern","Measure flywheel face and bore runout"]},
 {t:'Oil pan',p:['oilPan'],why:"Closes the bottom end once everything inside has been measured and checked.",
  std:["New gasket; sealant at joints only where specified","Torque from the centre outward in sequence"]},
 {t:'Cylinder head gasket',p:['headGasket'],why:"Fitted only after liner protrusion has been confirmed.",
  std:["Deck and head faces clean and dry","No oil or coolant left in bolt holes (it can hydraulic-lock and crack the block)","Gasket fitted dry on its dowels, correct way up"]},
 {t:'Cylinder head assembly',p:['head','valves','springs'],why:"Valves and springs are fitted to the head on the bench, then the whole assembly is lifted on.",
  std:["Pressure-test the head and check flatness","Grind valve seats and faces; measure valve recess or protrusion","Test spring free length and load","New head bolts, or measure bolt length as the manual specifies","Lubricate bolts; torque from the centre outward in stages, then angle-turn"]},
 {t:'Crossheads',p:['crossheads'],why:"They sit on the valve stems and must be in place before the rockers go on.",
  std:["Each crosshead sits squarely on both valve stems","Lubricate the contact faces"]},
 {t:'Injectors',p:['injectors'],why:"The injectors must be clamped before the fuel connectors are fitted, so the connector seats on a fixed injector.",
  std:["Clean the injector bores; new sealing washer and O-rings","Fit and torque the hold-down clamp before the fuel connector","Keep every fuel opening capped until it is connected"]},
 {t:'Fuel connectors',p:['connectors'],why:"Once the injectors are fixed, the connectors can be seated into the injector inlets.",
  std:["Inspect connector tips for burrs or damage and replace if found","Seat the connector into the injector inlet, then torque the retaining nut","Under-torque leaks; over-torque damages the seat"]},
 {t:'Camshaft & cam gear',p:['camshaft','camGear'],why:"The cam is timed to the crank through the gear train that was already set at TDC.",
  std:["Coat lobes and journals with assembly lube","Cylinder 1 at TDC; align the cam gear timing mark with the idler","Torque bearing caps in sequence; measure cam end play and gear backlash"]},
 {t:'Rocker levers & shaft',p:['rockers'],why:"Rockers are fitted once the cam and crossheads are in.",
  std:["Lubricate shafts and rollers","Torque the shaft capscrews in sequence"]},
 {t:'Engine brake & valve lash',p:['brake'],why:"Lash is set on the finished valvetrain, at the barring positions for each cylinder.",
  std:["Bar the engine over by hand to each lash-setting position (never with the starter)","Set intake and exhaust lash with a feeler gauge while the valves are fully closed","Set engine brake lash; recheck after tightening locknuts"]},
 {t:'Valve cover',p:['valveCover'],why:"Seals the top end once lash has been set and checked.",
  std:["New gasket and isolators","Torque in sequence; don't over-tighten isolated covers"]},
 {t:'Front cover, seal & damper',p:['frontCover','damper'],why:"Closes the gear train once all timing is confirmed.",
  std:["Fit the new front seal with its installer, following the seal's lubrication instructions","Inspect the viscous damper and discard it if dented, leaking or out of thickness spec","Torque damper capscrews in a cross pattern"]},
 {t:'High-pressure fuel system',p:['fuelPump','fuelRail','hpLines','fuelFilter'],why:"Fuel parts go on late so they stay sealed and clean for as long as possible.",
  std:["Absolute cleanliness: uncap each port only at the moment it is connected","Replace high-pressure lines wherever the manual requires it after removal","Torque line nuts; fit every support clamp","New fuel filter"]},
 {t:'Intake manifold & connection',p:['intakeManifold','intakeConnection'],why:"Goes on after the fuel connectors, which it partly covers.",
  std:["New gaskets; torque in sequence","Check for debris in the ports before fitting"]},
 {t:'Exhaust manifold',p:['exhaustManifold'],why:"The base the turbocharger mounts on.",
  std:["New gaskets; high-temperature anti-seize on studs","Slip joints assembled free to move","Torque in sequence; re-torque after a heat cycle if specified"]},
 {t:'Turbocharger',p:['turbine','chra','compressor','vgt'],why:"Mounted on the finished exhaust manifold, with oil feed and drain lines from the block.",
  std:["Check shaft axial and radial play; inspect both wheels for damage","Pre-lube the centre housing with clean oil through the feed port","New gaskets; the oil drain must run downhill with no kinks","Calibrate the VGT actuator with the service tool after fitting"]},
 {t:'Air & exhaust plumbing',p:['chargePipes','exhaustOutlet'],why:"Connects the turbo to the air cleaner, charge air cooler and aftertreatment.",
  std:["Clamps torqued; leak-test the charge air system","V-band clamp seated evenly all the way around"]},
 {t:'EGR system',p:['egrTube','egrCooler','egrValve'],why:"Bridges the finished exhaust and intake sides.",
  std:["New gaskets; pressure-test the cooler for coolant leaks","EGR valve moves freely; connector latched"]},
 {t:'Cooling & lube components',p:['waterPump','thermostat','oilCooler','oilFilter'],why:"External components that complete the coolant and oil circuits.",
  std:["New seals and gaskets","Oil cooler pressure-tested","New oil filter, filled as the manual specifies"]},
 {t:'Accessory drive',p:['fan','alternator','belt','airCompressor'],why:"Goes on after the front cover, damper and water pump it depends on.",
  std:["Check pulley alignment","Belt routed correctly; tensioner moves freely through its range","Air compressor drive gear backlash checked"]},
 {t:'Starter, ECM & sensors',p:['starter','ecm','crankSensor','camSensor','imap','railSensor','coolantSensor','oilSensor','turboSensor'],why:"Electronics go on last so they can't be damaged during heavy assembly.",
  std:["Sensors clean, new O-rings, correct air gap where adjustable","Harness connectors fully latched; ECM fuel cooling plate connected","Battery cables and ground straps clean and torqued"]},
 {t:'First start & commissioning',p:[],why:"The engine is complete. These checks protect a fresh build in its first minutes.",
  std:["Fill with oil and coolant; bleed air from the cooling system","Prime the fuel system until it is free of air","Pre-lube until oil pressure shows before firing","Start and idle; confirm oil pressure immediately and check for leaks everywhere","Clear fault codes, warm up, recheck levels and any re-torque items"]},
];


export const flows=X=>[
 {k:'Air',c:0x5aa9ff,pts:[[7.6,5.3,3.4],[4.5,5.4,3.4],[2.6,5.5,3.3],[1.4,5.45,2.95],[0.8,5.45,2.95],[0.7,5.97,3.05],[0.7,6.33,3.3],[1.3,6.75,2.85],[3,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]]},
 {k:'Air',c:0x7cc0ff,pts:[[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.0,5.25,-1.6],[4.5,5.2,-1.56],[-4.6,5.2,-1.56]]},
 {k:'Exhaust',c:0xff5d4d,pts:[[4.4,4.95,1.85],[-0.4,4.95,1.85],[-0.4,5.0,2.3],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]]},
 {k:'Exhaust',c:0xff7a4d,pts:[[-4.4,4.95,1.85],[-0.4,4.95,1.85],[-0.4,5.0,2.3],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]]},
 {k:'EGR',c:0xb48cff,pts:[[-4.55,4.95,1.85],[-5.3,5.4,1.8],[-5.55,6.6,1.4],[-5.55,7.55,0.3],[-5.5,7.3,-1.2],[-4.2,6.5,-1.8],[-2.75,6.15,-1.82],[2.8,6.15,-1.82],[3.65,6.15,-1.82],[4.4,6.1,-1.75],[4.95,5.85,-1.62],[5.0,5.4,-1.6],[4.5,5.2,-1.56]]},
 {k:'Fuel',c:0xffd23f,pts:[[-1.0,-0.3,-2.05],[-1.0,0.75,-2.0],[0.5,1.05,-2.25],[2.8,1.6,-2.25],[3.6,1.9,-2.05],[4.4,2.3,-1.85],[4.7,2.9,-1.95],[4.75,3.65,-1.65],[4.4,3.9,-1.45],[-4.3,3.9,-1.45]]},
 ...[1,2,3,4,5,6].map(i=>({k:'Fuel',c:0xffe27a,n:10,pts:[[X(i),4.0,-1.45],[X(i),4.3,-1.52],[X(i),4.6,-1.45],[X(i),4.6,-0.15],[X(i),4.4,0]]})),
 {k:'Coolant',c:0x3fd6b0,pts:[[6.25,2.3,-0.9],[5.4,2.2,-1.05],[3.6,1.3,-1.62],[0.2,1.3,-1.62],[-4.6,2.5,-0.95],[-4.8,4.1,-0.95],[-4.6,5.0,-0.6],[4.6,5.0,-0.6],[5.45,5.1,-0.85],[5.45,5.3,-0.85],[6.35,5.3,-0.85]]},
 {k:'Oil',c:0xe3a35b,pts:[[3.6,-2.65,0.3],[4.0,-2.2,0.4],[4.0,-1.5,0.3],[3.4,-0.9,-1.1],[2.6,1.1,-1.62],[1.4,0.78,-1.98],[1.4,0.0,-2.05],[1.15,0.7,-1.8],[0.0,0.95,-1.35],[-4.8,0.95,-1.35],[-4.8,5.0,-0.3],[-4.8,6.5,0.45],[4.8,6.5,0.45]]},
];

// Turning parts other than the crank, rods, pistons and valves (the core moves those). th = crank angle in radians.
export function spin(A,th){
  A.gC.rotation.x=th;A.gA.rotation.x=-th*16/30;A.gB.rotation.x=th*16/48;A.gCam.rotation.x=-th/2;A.cam.rotation.x=-th/2;
  A.fan.rotation.x=th*1.15;A.fanP.rotation.x=th*1.15;A.wp.rotation.x=th*1.6;A.alt.rotation.x=th*3.1;A.tens.rotation.x=th*3.0;
  A.turb.rotation.x=th*9;A.comp.rotation.x=th*9;
}

export function builders(h){
const {THREE,D2R,X,S,R,L,DECK,PH,IN_PEAK,EX_PEAK,A,FXMAT,GLOW,MAT,mesh,box,rbox,cyl,cylG,hex,torus,tube,shapeYZ,extrudeX,beamYZ,gearGeo,circlesHull,Helix,latheX,voluteGeo,lobe,webShape,canister}=h;
const B={};
/* gear train geometry: crank 16T, idler A 30T, idler B 48T, cam 32T (2:1) */
const GR={crank:0.48,A:0.9,B:1.44,cam:0.96};
const GC={crank:[0,0],A:[1.3,0.46],cam:[5.95,0.9]};
(()=>{const[ay,az]=GC.A,[cy,cz]=GC.cam,dy=cy-ay,dz=cz-az,d=Math.hypot(dy,dz),R1=GR.A+GR.B,R2=GR.B+GR.cam;const a=(d*d+R1*R1-R2*R2)/(2*d),h=Math.sqrt(Math.max(0,R1*R1-a*a)),uy=dy/d,uz=dz/d;GC.B=[ay+a*uy+h*uz,az+a*uz-h*uy];})();
const housingHull=circlesHull([[0,0,0.75],[...GC.A,GR.A+0.22],[...GC.B,GR.B+0.22],[...GC.cam,GR.cam+0.22]]);

/* shared geometries */
const G={
  piston:new THREE.LatheGeometry([[0.001,-0.62],[0.58,-0.62],[0.6,-1.35],[0.67,-1.35],[0.67,-0.55],[0.685,-0.5],[0.685,-0.03],[0.66,0],[0.46,0],[0.4,-0.06],[0.32,-0.2],[0.12,-0.21],[0.001,-0.1]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  ring:(()=>{const g=new THREE.TorusGeometry(0.672,0.02,8,64);g.rotateX(Math.PI/2);return g;})(),
  liner:new THREE.LatheGeometry([[0.69,1.6],[0.8,1.6],[0.8,4.26],[0.885,4.26],[0.885,DECK],[0.69,DECK],[0.69,1.6]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  valve:new THREE.LatheGeometry([[0.001,0],[0.2,0],[0.2,0.03],[0.07,0.13],[0.04,0.22],[0.04,1.66],[0.001,1.66]].map(([r,y])=>new THREE.Vector2(r,y)),24),
  spring:new THREE.TubeGeometry(new Helix(0.11,0.35,6.5),150,0.018,6,false),
};
B.block=g=>{const m=MAT.orange(),hw=MAT.zinc(),sm=MAT.steel();
  // main casting: deck lip, narrow water-jacket waist, oil-gallery belt, flared crankcase skirt
  g.add(extrudeX(shapeYZ([[-0.55,-1.5],[0.85,-1.52],[1.25,-1.38],[1.7,-1.18],[4.0,-1.18],[4.1,-1.3],[DECK,-1.3],[DECK,1.3],[4.1,1.3],[4.0,1.18],[1.7,1.18],[1.25,1.38],[0.85,1.52],[-0.55,1.5]]),-5.25,5.25,m,0.04));
  for(let i=1;i<=6;i++)for(const s of[-1,1]){const b=cyl(.62,.62,2.15,'y',m,X(i),2.88,s*1.04,40);b.scale.z=0.42;g.add(b);   // cylinder barrels through the jacket
    g.add(cyl(.15,.15,.05,'z',sm,X(i),3.1,s*1.32));}                                                                    // core plugs
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1]){
    g.add(box(.16,2.2,.18,m,x,2.9,s*1.25));                                     // head-bolt columns between barrels
    g.add(box(.18,1.1,.16,m,x,0.6,s*1.48));                                     // bulkhead ribs on the skirt
    g.add(cyl(.12,.12,.16,'z',m,x,0.15,s*1.56));hex(g,x,0.15,s*1.66,'z',.07,hw);}}   // main-cap side bolts
  for(const s of[-1,1])g.add(box(10.3,.1,.12,m,0,1.72,s*1.22));                // oil gallery belt
  g.add(cyl(.12,.12,10.3,'x',m,0,0.95,-1.53));
  for(const s of[-1,1]){g.add(rbox(.9,.7,.3,.06,m,3.9,0.75,s*1.68));for(const dy of[-0.18,0.18])hex(g,3.9,0.75+dy,s*1.85,'z',.07,hw);}   // front engine-mount pads
  g.add(rbox(10.5,0.12,3.06,0.04,m,0,-0.5,0));
};
const CAP_SHAPE=(()=>{const p=[[-0.69,-1.1],[-0.69,1.1],[0,1.1],[0,0.46]];for(let k=1;k<12;k++){const t=k/12*Math.PI;p.push([-0.46*Math.sin(t),0.46*Math.cos(t)]);}p.push([0,-0.46],[0,-1.1]);return shapeYZ(p);})();
B.mainCaps=g=>{const m=MAT.iron(),hw=MAT.zinc();for(let k=0;k<7;k++){const x=(3-k)*S;g.add(extrudeX(CAP_SHAPE,x-0.17,x+0.17,m,0.02));for(const s of[-1,1])hex(g,x,-0.74,s*0.82,'y',.08,hw);}};
B.bearings=g=>{const m=MAT.bronze();m.side=THREE.DoubleSide;for(let k=0;k<7;k++)g.add(cyl(.445,.445,.32,'x',m,(3-k)*S,0,0,32,true));
  const rot=new THREE.Group();A.rodBrg=rot;g.add(rot);for(let i=1;i<=6;i++){const a=-PH[i-1]*D2R;rot.add(cyl(.405,.405,.4,'x',m,X(i),R*Math.cos(a),R*Math.sin(a),32,true));}};
B.crankshaft=g=>{const rot=new THREE.Group();A.crank=rot;g.add(rot);const m=MAT.steel(),w=MAT.dark();
  for(let k=0;k<7;k++)rot.add(cyl(.42,.42,.4,'x',m,(3-k)*S,0,0));
  for(let i=1;i<=6;i++){const a=-PH[i-1]*D2R;rot.add(cyl(.38,.38,.7,'x',m,X(i),R*Math.cos(a),R*Math.sin(a)));
    for(const s of[-1,1])rot.add(extrudeX(webShape(a),X(i)+s*0.5-0.15,X(i)+s*0.5+0.15,w,0.02));}
  rot.add(cyl(.32,.32,1.1,'x',m,5.85,0,0));rot.add(cyl(.6,.6,.25,'x',m,-5.42,0,0));
  const tw=mesh(gearGeo(60,0.66,0.06),MAT.dark(),-5.2,0,0);rot.add(tw);};
B.liners=g=>{const m=MAT.iron();m.side=THREE.DoubleSide;const o=MAT.rubber();for(let i=1;i<=6;i++){g.add(mesh(G.liner,m,X(i),0,0));g.add(torus(.8,.025,'y',o,X(i),1.75,0));g.add(torus(.8,.025,'y',o,X(i),1.9,0));}};
B.pistons=g=>{const m=MAT.steel();m.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(mesh(G.piston,m,0,0.85,0));g.add(p);A.pist.push(p);}};
B.rings=g=>{const top=MAT.dark(),m=MAT.gasket();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);[[0.73,top],[0.61,m],[0.47,m]].forEach(([y,mm])=>p.add(mesh(G.ring,mm,0,y,0)));g.add(p);A.ring.push(p);}};
B.wristPins=g=>{const m=MAT.chrome();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(cyl(.19,.19,1.0,'x',m,0,0,0));g.add(p);A.pin.push(p);}};
const ROD_SHAPE=(()=>{const s=shapeYZ(circlesHull([[0,0,0.6],[L,0,0.31]],48));for(const[cy,r]of[[0,0.41],[L,0.21]]){const p=new THREE.Path();p.absarc(0,cy,r,0,Math.PI*2,true);s.holes.push(p);}return s;})();
const ROD_RIB=shapeYZ(circlesHull([[0.85,0,0.17],[L-0.55,0,0.09]],24));
B.rods=g=>{const m=MAT.dark(),b=MAT.bronze(),hw=MAT.zinc();b.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const r=new THREE.Group();
  r.add(extrudeX(ROD_SHAPE,-0.15,0.15,m,0.025));
  for(const s of[-1,1])r.add(extrudeX(ROD_RIB,s>0?0.17:-0.21,s>0?0.21:-0.17,m,0.015));   // I-beam flanges
  for(const s of[-1,1]){r.add(box(.36,.02,.2,MAT.black(),0,0,s*0.5));hex(r,0,-0.56,s*0.42,'y',.075,hw);}  // fracture-split line + cap bolts
  r.add(cyl(.205,.205,.32,'x',b,0,L,0,32,true));
  g.add(r);A.rod.push(r);}};
B.flywheel=g=>{const rot=new THREE.Group();rot.position.x=-5.78;A.fly=rot;g.add(rot);
  rot.add(cyl(2.12,2.12,.36,'x',MAT.dark(),0,0,0,72));rot.add(mesh(gearGeo(120,2.2,.18),MAT.steel(),-0.06,0,0));
  rot.add(cyl(1.55,1.55,.04,'x',MAT.steel(),-0.2,0,0,64));const bm=MAT.steel();for(let k=0;k<8;k++){const a=k/8*Math.PI*2;rot.add(cyl(.07,.07,.1,'x',bm,-0.22,0.45*Math.cos(a),0.45*Math.sin(a),6));}};
B.flywheelHousing=g=>{const m=MAT.orange(),hw=MAT.zinc();m.side=THREE.DoubleSide;
  // SAE bell: flares from the block face out to the transmission flange
  g.add(latheX([[2.2,0],[2.3,0.12],[2.46,0.45],[2.56,0.8],[2.6,0.92],[2.82,0.94],[2.84,1.0],[2.82,1.07],[2.5,1.07]],m,-5.25,0,0,96,-1));
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.95,2.22,72),m);ring.rotation.y=Math.PI/2;ring.position.x=-5.26;ring.castShadow=true;g.add(ring);
  for(let k=0;k<12;k++){const a=(k+0.5)/12*Math.PI*2,b=box(.5,.3,.07,m,-5.92,2.62*Math.cos(a),2.62*Math.sin(a));b.rotation.x=a;g.add(b);}   // gussets
  g.add(cyl(.5,.5,.6,'z',m,-5.6,0.05,1.95));g.add(cyl(.18,.18,.3,'y',m,-5.6,2.55,0.6));
  for(let k=0;k<14;k++){const a=k/14*Math.PI*2;hex(g,-6.36,2.72*Math.cos(a),2.72*Math.sin(a),'x',.07,hw);}};
B.damper=g=>{const rot=new THREE.Group();rot.position.x=6.0;A.damper=rot;g.add(rot);const pm=MAT.steel(),hw=MAT.zinc();
  // sealed viscous housing: stepped face, rolled outer rim, raised hub
  rot.add(latheX([[0.3,-0.15],[1.06,-0.15],[1.12,-0.1],[1.12,0.1],[1.06,0.15],[0.84,0.15],[0.8,0.09],[0.44,0.09],[0.41,0.16],[0.3,0.16]],MAT.dark(),0,0,0,96));
  rot.add(torus(1.0,.025,'x',MAT.black(),0.15,0,0,72));
  // poly-V crank pulley
  const pv=[[0.3,0.16],[0.72,0.16],[0.8,0.2]];for(let k=0;k<6;k++)pv.push([0.75,0.225+k*0.035],[0.8,0.24+k*0.035]);pv.push([0.8,0.43],[0.7,0.46],[0.3,0.46]);
  rot.add(latheX(pv,pm,0,0,0,72));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;hex(rot,0.5,0.22*Math.cos(a),0.22*Math.sin(a),'x',.06,hw);}};
function gearMesh(T,r,m,y,z){const grp=new THREE.Group();grp.position.set(5.43,y,z);grp.add(mesh(gearGeo(T,r,.18),m));grp.add(cyl(r*0.35,r*0.35,.24,'x',MAT.dark(),0,0,0));return grp;}
B.gearTrain=g=>{const m=MAT.steel();A.gC=gearMesh(16,GR.crank,m,0,0);A.gA=gearMesh(30,GR.A,m,...GC.A);A.gB=gearMesh(48,GR.B,m,...GC.B);g.add(A.gC,A.gA,A.gB);};
B.camGear=g=>{A.gCam=gearMesh(32,GR.cam,MAT.steel(),...GC.cam);g.add(A.gCam);};
B.gearHousing=g=>{const m=MAT.orange();g.add(extrudeX(shapeYZ(housingHull),5.25,5.33,m));};
B.frontCover=g=>{const m=MAT.orange();g.add(extrudeX(shapeYZ(housingHull),5.54,5.72,m,0.03));g.add(torus(.4,.05,'x',MAT.rubber(),5.74,0,0));
  const bm=MAT.steel();housingHull.filter((_,i)=>i%7===0).forEach(([y,z])=>{const k=0.88;g.add(cyl(.05,.05,.06,'x',bm,5.74,y*k+GC.B[0]*(1-k),z*k+GC.B[1]*(1-k),6));});};
function panProf(d,wb){const r=0.28,p=[[-0.6,1.45],[-0.64,1.42]];for(let k=0;k<=6;k++){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),wb-r+r*Math.cos(a)]);}
  for(let k=6;k>=0;k--){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),-(wb-r+r*Math.cos(a))]);}p.push([-0.64,-1.42],[-0.6,-1.45]);return shapeYZ(p);}
B.oilPan=g=>{const m=MAT.black();m.side=THREE.DoubleSide;
  g.add(extrudeX(panProf(1.62,1.12),-5.15,1.75,m,0.07));                        // shallow rear section
  g.add(extrudeX(panProf(2.9,1.0),1.45,5.15,m,0.07));                           // deep front sump
  for(let k=0;k<5;k++)for(const s of[-1,1])g.add(box(.06,1.0,.07,m,1.9+k*0.75,-2.1,s*1.06));   // sump stiffening ribs
  g.add(rbox(10.5,0.1,3.1,0.03,m,0,-0.6,0));const hw=MAT.zinc();hex(g,3.0,-2.95,0.4,'y',.1,hw);
  for(let k=0;k<13;k++)for(const s of[-1,1])hex(g,-5.0+k*0.83,-0.69,s*1.5,'y',.06,hw);};
B.headGasket=g=>{g.add(box(10.45,0.04,2.55,MAT.gasket(),0,DECK+0.02,0));};
B.head=g=>{const m=MAT.orange(),hw=MAT.zinc();
  // one-piece head: thick fire deck, waisted sides, machined top rail
  g.add(extrudeX(shapeYZ([[4.4,-1.32],[4.52,-1.36],[4.62,-1.28],[5.45,-1.26],[5.58,-1.32],[5.65,-1.3],[5.65,1.3],[5.58,1.32],[5.45,1.26],[4.62,1.28],[4.52,1.36],[4.4,1.32]]),-5.25,5.25,m,0.03));
  for(let i=1;i<=6;i++){g.add(rbox(.82,.5,.12,.05,m,X(i),4.95,1.31));g.add(rbox(.82,.48,.1,.04,m,X(i),5.2,-1.3));}   // port bosses
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1])g.add(cyl(.13,.13,1.1,'y',m,x,5.05,s*1.3,24));}           // head-bolt columns
  for(const[x,z]of[[4.55,-1.42],[-4.55,1.42]]){g.add(box(.42,.5,.09,m,x,5.85,z));g.add(torus(.14,.045,'z',m,x,6.2,z));hex(g,x-0.12,5.75,z+(z>0?0.06:-0.06),'z',.05,hw);hex(g,x+0.12,5.75,z+(z>0?0.06:-0.06),'z',.05,hw);}   // lifting eyes
};
const VC_PROF=(()=>{const p=[];for(let k=0;k<=32;k++){const t=k/32*Math.PI,c=Math.cos(t),s=Math.sin(t);p.push([5.7+1.4*Math.pow(s,0.55),1.12*Math.sign(c)*Math.pow(Math.abs(c),0.4)]);}return p;})();
const vcTop=z=>{const c=Math.pow(Math.min(1,Math.abs(z)/1.12),2.5);return 5.7+1.4*Math.pow(Math.sqrt(1-c*c),0.55)+0.1;};
B.valveCover=g=>{const m=MAT.chrome();g.add(extrudeX(shapeYZ(VC_PROF),-5.05,5.05,m,0.1));g.add(rbox(10.5,0.1,2.62,0.03,MAT.black(),0,5.7,0));
  g.add(cyl(.2,.2,.12,'y',MAT.black(),2.7,vcTop(-0.55)+0.04,-0.55,32));g.add(box(.3,.06,.06,MAT.black(),2.7,vcTop(-0.55)+0.12,-0.55));   // oil fill cap
  g.add(cyl(.12,.12,.25,'x',MAT.black(),-5.2,6.7,-0.6,24));                                                                              // crankcase breather
  const c=document.createElement('canvas');c.width=1024;c.height=256;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const draw=()=>{const x=c.getContext('2d');x.clearRect(0,0,1024,256);x.fillStyle='#121212';x.font='700 210px "Barlow Condensed","Arial Narrow",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('ISX15',512,140);t.needsUpdate=true;};
  draw();document.fonts&&document.fonts.load('700 100px "Barlow Condensed"').then(draw).catch(()=>{});
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(3.6,0.9),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.5,metalness:.1}));pl.rotation.x=-Math.PI/2;pl.position.set(-0.6,vcTop(0)+0.006,0);g.add(pl);
  const hw=MAT.zinc(),iso=MAT.rubber(),by=vcTop(0.75);for(let k=0;k<7;k++)for(const s of[-1,1]){const x=(3-k)*S+(k===6?0.3:0);g.add(cyl(.11,.11,.03,'y',iso,x,by,s*0.75));hex(g,x,by+0.05,s*0.75,'y',.075,hw);}};
B.valves=g=>{const mi=MAT.steel(),me=MAT.hot();for(let i=1;i<=6;i++){for(const[arr,dx,m]of[[A.vI,0.33,mi],[A.vE,-0.33,me]]){const v=new THREE.Group();for(const z of[-0.3,0.3])v.add(mesh(G.valve,m,X(i)+dx,4.42,z));g.add(v);arr.push(v);}}};
B.springs=g=>{const m=MAT.dark(),rm=MAT.steel();for(let i=1;i<=6;i++){for(const[sa,ta,dx]of[[A.sI,A.tI,0.33],[A.sE,A.tE,-0.33]]){const sp=[];const tg=new THREE.Group();
  for(const z of[-0.3,0.3]){const s=mesh(G.spring,m,X(i)+dx,5.65,z);g.add(s);sp.push(s);tg.add(cyl(.13,.13,.04,'y',rm,X(i)+dx,6.0,z,20));}
  g.add(tg);sa.push(sp);ta.push(tg);}}};
B.crossheads=g=>{const m=MAT.steel();for(let i=1;i<=6;i++)for(const[arr,dx]of[[A.chI,0.33],[A.chE,-0.33]]){const c=new THREE.Group();c.add(box(.12,.08,.74,m,X(i)+dx,6.12,0));c.add(cyl(.06,.06,.04,'y',m,X(i)+dx,6.17,0,12));g.add(c);arr.push(c);}};
B.camshaft=g=>{const rot=new THREE.Group();rot.position.set(0,5.95,0.9);A.cam=rot;g.add(rot);const m=MAT.steel();
  rot.add(cyl(.12,.12,10.7,'x',m,0.1,0,0));for(let k=0;k<7;k++)rot.add(cyl(.22,.22,.22,'x',m,(3-k)*S,0,0));
  for(let i=1;i<=6;i++){rot.add(lobe(X(i)+0.33,(IN_PEAK+PH[i-1])/2,m));rot.add(lobe(X(i)-0.33,(EX_PEAK+PH[i-1])/2,m));}
  const cm=MAT.orange();for(let k=0;k<7;k++){const x=(3-k)*S;g.add(box(.26,.22,.62,cm,x,6.13,0.9));g.add(box(.26,.12,.62,cm,x,5.71,0.9));}};
B.rockers=g=>{const m=MAT.dark(),sm=MAT.steel(),om=MAT.orange();g.add(cyl(.09,.09,10.5,'x',sm,0,6.5,0.45));
  for(let k=0;k<7;k++)g.add(box(.22,.85,.26,om,(3-k)*S,6.07,0.45));
  const lever=shapeYZ(circlesHull([[0,0,0.15],[-0.27,0.45,0.1],[-0.24,-0.45,0.075]],32));
  for(let i=1;i<=6;i++)for(const[arr,dx]of[[A.rkI,0.33],[A.rkE,-0.33]]){const r=new THREE.Group();r.position.set(X(i)+dx,6.5,0.45);
    r.add(cyl(.15,.15,.17,'x',m,0,0,0));r.add(extrudeX(lever,-0.055,0.055,m,0.012));
    r.add(cyl(.08,.08,.11,'x',sm,0,-0.27,0.45,20));r.add(cyl(.035,.035,.2,'y',sm,0,-0.22,-0.45,8));r.add(cyl(.06,.06,.05,'y',sm,0,-0.16,-0.45,6));
    g.add(r);arr.push(r);}};
B.brake=g=>{const m=MAT.black();g.add(box(10.2,.12,.3,MAT.orange(),0,6.8,0.45));for(let i=1;i<=6;i++){g.add(cyl(.1,.1,.22,'y',m,X(i)-0.33,6.97,0.45,16));g.add(box(.1,.06,.12,MAT.bronze(),X(i)-0.33,7.1,0.45));}};
B.injectors=g=>{const b=MAT.steel(),n=MAT.dark(),c=MAT.black();for(let i=1;i<=6;i++){const x=X(i);
  g.add(cyl(.04,.05,.3,'y',n,x,4.5,0,12));g.add(cyl(.1,.1,1.25,'y',b,x,5.255,0,20));g.add(cyl(.12,.12,.2,'y',b,x,5.98,0,20));g.add(box(.16,.12,.22,c,x,6.14,0));g.add(box(.1,.06,.42,n,x,5.75,-0.2));
  const fx=new THREE.Group();fx.position.set(x,4.33,0);fx.visible=false;const sm=new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});FXMAT.add(sm);
  for(let k=0;k<6;k++){const cg=new THREE.ConeGeometry(0.06,0.5,10,1,true);cg.translate(0,-0.25,0);const cm=new THREE.Mesh(cg,sm);cm.rotation.order='YXZ';cm.rotation.set(0,k*60*D2R,68*D2R);cm.userData.fx=true;fx.add(cm);}
  g.add(fx);A.spray.push(fx);
  const fm=new THREE.SpriteMaterial({map:GLOW,color:0xff7a2a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});FXMAT.add(fm);const fl=new THREE.Sprite(fm);fl.position.set(x,4.25,0);fl.scale.setScalar(1.3);fl.visible=false;fl.userData.fx=true;g.add(fl);A.flame.push(fl);}};
B.connectors=g=>{const m=MAT.steel(),nm=MAT.bronze();for(let i=1;i<=6;i++){g.add(cyl(.05,.05,1.23,'z',m,X(i),4.6,-0.705,12));g.add(cyl(.1,.1,.14,'z',nm,X(i),4.6,-1.37,6));}};
B.hpLines=g=>{const m=MAT.steel();for(let i=1;i<=6;i++){const x=X(i);g.add(tube([[x,4.02,-1.45],[x,4.25,-1.52],[x,4.5,-1.5],[x,4.6,-1.45]],.035,m,24));}
  g.add(tube([[4.4,2.3,-1.85],[4.7,2.9,-1.95],[4.75,3.65,-1.65],[4.42,3.9,-1.45]],.04,m,32));};
B.fuelRail=g=>{const m=MAT.steel();g.add(cyl(.13,.13,8.8,'x',m,0,3.9,-1.45));for(const s of[-1,1])g.add(cyl(.15,.15,.12,'x',m,s*4.4,3.9,-1.45,6));
  for(let i=1;i<=6;i++)g.add(cyl(.07,.07,.14,'y',m,X(i),4.02,-1.45,6));for(const x of[-3,0,3])g.add(box(.15,.3,.14,MAT.dark(),x,3.72,-1.36));};
B.fuelPump=g=>{const a=MAT.alu(),d=MAT.dark();g.add(cyl(.38,.38,1.4,'x',a,4.55,1.9,-1.85));g.add(cyl(.48,.48,.1,'x',a,5.2,1.9,-1.85));g.add(rbox(.55,.62,.62,.05,d,3.6,1.9,-1.85));
  g.add(cyl(.12,.12,.3,'y',MAT.black(),4.3,2.38,-1.85,16));g.add(cyl(.06,.06,.2,'y',MAT.steel(),4.4,2.3,-1.85,6));};
B.fuelFilter=g=>{g.add(rbox(.55,.25,.55,.04,MAT.alu(),-1.0,0.75,-2.0));canister(g,-1.0,0.63,-2.05,.27,.9,MAT.filter());
  const bowl=new THREE.MeshPhysicalMaterial({color:0xd9e2e6,roughness:.08,transmission:.6,transparent:true,opacity:.75,thickness:.2});g.add(cyl(.2,.17,.22,'y',bowl,-1.0,-0.38,-2.05));g.add(cyl(.05,.05,.08,'y',MAT.plastic(),-1.0,-0.53,-2.05,6));
  g.add(box(.2,.3,.5,MAT.dark(),-1.0,0.75,-1.6));g.add(tube([[-0.75,0.75,-2.0],[0.5,1.05,-2.25],[2.8,1.6,-2.25],[3.4,1.9,-2.05]],.04,MAT.rubber(),48));};
B.ecm=g=>{const b=MAT.black(),a=MAT.alu();g.add(rbox(2.3,1.3,.1,.02,b,-3.05,2.9,-1.47));g.add(box(2.4,1.4,.05,a,-3.05,2.9,-1.39));
  for(let k=0;k<9;k++)g.add(box(.04,1.1,.06,b,-4.0+k*0.24,2.9,-1.55));g.add(box(.5,.18,.16,MAT.plastic(),-3.6,3.6,-1.47));g.add(box(.5,.18,.16,MAT.plastic(),-2.6,3.6,-1.47));};
B.intakeManifold=g=>{const m=MAT.alu(),hw=MAT.zinc();g.add(rbox(9.6,.62,.5,.12,m,-0.1,5.2,-1.56));for(let i=1;i<=6;i++)g.add(rbox(.8,.5,.14,.04,m,X(i),5.2,-1.33));
  for(let k=0;k<12;k++)hex(g,-4.55+k*0.82,5.53,-1.72,'y',.05,hw);};
B.intakeConnection=g=>{const m=MAT.alu();g.add(cyl(.3,.3,.6,'x',m,5.0,5.25,-1.6));g.add(rbox(.55,.55,.6,.08,m,5.0,5.55,-1.6));g.add(torus(.31,.03,'x',MAT.dark(),5.28,5.25,-1.6));};
B.imap=g=>{g.add(cyl(.08,.08,.22,'y',MAT.black(),0.3,5.62,-1.56,16));g.add(box(.14,.1,.18,MAT.plastic(),0.3,5.75,-1.56));};
B.chargePipes=g=>{const a=MAT.alu(),r=MAT.rubber();
  g.add(tube([[0.7,6.33,3.3],[1.3,6.75,2.85],[3.0,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]],.24,a,64));
  g.add(tube([[1.35,5.45,2.95],[2.6,5.5,3.3],[4.5,5.4,3.4],[7.6,5.3,3.4]],.33,r,64));
  g.add(tube([[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.3,5.25,-1.6]],.27,a,48));
  for(const[x,y,z]of[[7.6,6.3,2.55],[7.6,5.3,3.4],[7.6,5.7,-2.5]])g.add(torus(z>0&&y<6?.35:.28,.04,'x',MAT.dark(),x,y,z));};
B.exhaustManifold=g=>{const m=MAT.hot();
  // log grows toward the turbine feed in the middle; three pieces joined by slip joints
  g.add(cyl(.23,.27,2.5,'x',m,3.3,4.95,1.85));g.add(cyl(.29,.29,3.9,'x',m,0,4.95,1.85));g.add(cyl(.27,.23,2.5,'x',m,-3.3,4.95,1.85));
  for(const s of[-1,1]){g.add(cyl(.33,.33,.2,'x',MAT.iron(),s*2.0,4.95,1.85));g.add(cyl(.2,.2,.1,'x',m,s*4.6,4.95,1.85));}
  const hw=MAT.zinc();
  for(let i=1;i<=6;i++){const sw=X(i)>0?-0.28:0.28;g.add(tube([[X(i),4.95,1.34],[X(i),4.97,1.52],[X(i)+sw*0.5,4.96,1.7],[X(i)+sw,4.95,1.84]],.19,m,16));
    g.add(rbox(.72,.55,.07,.05,m,X(i),4.95,1.33));
    for(const dx of[-0.27,0.27])for(const dy of[-0.19,0.19])hex(g,X(i)+dx,4.95+dy,1.39,'z',.05,hw);}
  g.add(cyl(.25,.25,.5,'z',m,-0.4,4.97,2.15));};
B.turbine=g=>{const m=MAT.hot();m.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.36,.5,.07,.27,Math.PI-0.92*Math.PI*2),m,-0.4,5.45,2.95));     // snail-shell scroll, inlet at the bottom
  g.add(cyl(.27,.27,.65,'z',m,-0.4,4.95,2.62));g.add(cyl(.34,.34,.08,'z',m,-0.4,4.95,2.3,6));
  g.add(cyl(.4,.4,.42,'x',m,-0.4,5.45,2.95));g.add(cyl(.46,.46,.06,'x',m,-0.15,5.45,2.95));g.add(cyl(.33,.3,.45,'x',m,-0.8,5.45,2.95,32,true));
  const w=new THREE.Group();w.position.set(-0.75,5.45,2.95);A.turb=w;g.add(w);const wm=MAT.dark();w.add(cyl(.08,.12,.2,'x',wm,0,0,0,16));
  for(let k=0;k<11;k++){const a=k/11*Math.PI*2;const b=box(.18,.16,.02,wm,0,0.16*Math.cos(a),0.16*Math.sin(a));b.rotation.order='XYZ';b.rotation.set(a,0.45,0);w.add(b);}};
B.chra=g=>{const m=MAT.iron(),t=MAT.steel();g.add(cyl(.28,.28,.55,'x',m,0.1,5.45,2.95));
  g.add(tube([[0.1,5.73,2.95],[0.4,6.1,2.6],[1.25,5.9,1.6],[1.3,5.4,1.36],[1.3,4.0,1.3]],.045,t,48));
  g.add(tube([[0.1,5.17,2.95],[0.15,4.4,2.7],[0.3,3.6,1.9],[0.3,3.3,1.3]],.07,MAT.rubber(),40));};
B.compressor=g=>{const m=MAT.alu();m.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.38,.52,.07,.28,0.16*Math.PI),m,0.7,5.45,2.95));             // scroll, outlet at the top
  g.add(cyl(.5,.5,.2,'x',m,0.5,5.45,2.95));g.add(cyl(.34,.34,.55,'x',m,1.1,5.45,2.95,32,true));g.add(torus(.35,.04,'x',m,1.37,5.45,2.95));
  g.add(tube([[0.7,5.97,2.95],[0.7,5.98,3.15],[0.7,6.12,3.3],[0.7,6.35,3.3]],.25,m,24));
  const w=new THREE.Group();w.position.set(0.95,5.45,2.95);A.comp=w;g.add(w);const wm=MAT.chrome();w.add(cyl(.05,.2,.3,'x',wm,0,0,0,20));
  for(let k=0;k<10;k++){const a=k/10*Math.PI*2;const b=box(.3,.17,.02,wm,0,0.16*Math.cos(a),0.16*Math.sin(a));b.rotation.set(a,-0.5,0);w.add(b);}};
B.vgt=g=>{g.add(rbox(.6,.36,.5,.05,MAT.black(),-0.4,6.36,2.95));g.add(box(.18,.1,.2,MAT.plastic(),-0.65,6.58,2.95));g.add(cyl(.04,.04,.4,'y',MAT.steel(),-0.15,6.05,3.2,8));};
B.turboSensor=g=>{g.add(cyl(.05,.05,.25,'y',MAT.black(),0.15,5.83,2.95,12));};
B.exhaustOutlet=g=>{const m=MAT.steel();g.add(tube([[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]],.3,m,48));g.add(torus(.36,.05,'x',MAT.dark(),-1.02,5.45,2.95));};
B.egrCooler=g=>{const m=MAT.steel();g.add(cyl(.32,.32,5.4,'x',m,0.1,6.15,-1.82));for(const x of[-2.7,2.9])g.add(cyl(.36,.36,.25,'x',MAT.dark(),x,6.15,-1.82));
  for(let k=0;k<6;k++)g.add(torus(.33,.015,'x',MAT.dark(),-2.2+k*0.9,6.15,-1.82));
  g.add(tube([[2.6,6.45,-1.82],[3.0,6.9,-1.5],[4.6,6.6,-0.9],[5.35,5.6,-0.85]],.06,MAT.rubber(),40));};
B.egrValve=g=>{g.add(rbox(.6,.55,.55,.06,MAT.black(),3.35,6.15,-1.82));g.add(box(.2,.12,.25,MAT.plastic(),3.35,6.48,-1.82));
  g.add(tube([[3.65,6.15,-1.82],[4.4,6.1,-1.75],[4.95,5.85,-1.62],[5.0,5.82,-1.6]],.16,MAT.steel(),32));};
B.egrTube=g=>{const pts=[[-4.55,4.95,1.85],[-5.3,5.4,1.8],[-5.55,6.6,1.4],[-5.55,7.55,0.3],[-5.5,7.3,-1.2],[-4.2,6.5,-1.8],[-2.82,6.15,-1.82]];
  g.add(tube(pts,.18,MAT.steel(),80));const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  for(const u of[0.18,0.21,0.24,0.74,0.77,0.8]){const p=c.getPointAt(u),t=c.getTangentAt(u);const r=torus(.2,.035,'z',MAT.dark(),p.x,p.y,p.z);r.lookAt(p.clone().add(t));g.add(r);}};
B.waterPump=g=>{const a=MAT.alu();a.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.24,.31,.05,.15,0.3),a,5.9,2.3,-0.9));g.add(cyl(.3,.3,.22,'x',a,5.86,2.3,-0.9));g.add(cyl(.14,.16,.25,'x',a,6.08,2.3,-0.9));
  g.add(tube([[5.9,2.0,-1.25],[5.9,1.7,-1.55],[6.05,1.35,-1.75]],.12,MAT.rubber(),16));
  const w=new THREE.Group();w.position.set(6.25,2.3,-0.9);A.wp=w;g.add(w);
  w.add(latheX([[0.12,-0.08],[0.32,-0.08],[0.36,-0.04],[0.33,0],[0.36,0.04],[0.32,0.08],[0.12,0.08]],MAT.steel(),0,0,0,40));for(let k=0;k<4;k++){const a=k/4*Math.PI*2;w.add(cyl(.05,.05,.04,'x',MAT.dark(),0.09,0.2*Math.cos(a),0.2*Math.sin(a),8));}};
B.thermostat=g=>{const m=MAT.orange();g.add(cyl(.3,.3,.5,'y',m,5.45,5.25,-0.85));g.add(cyl(.2,.2,.9,'x',m,5.9,5.3,-0.85));g.add(torus(.22,.03,'x',MAT.dark(),6.25,5.3,-0.85));};
B.coolantSensor=g=>{g.add(cyl(.06,.06,.25,'y',MAT.black(),5.45,5.6,-0.6,12));};
B.oilPump=g=>{const m=MAT.iron();g.add(box(.8,.45,.9,m,4.0,-1.45,0.1));g.add(tube([[4.0,-1.65,0.3],[4.0,-2.2,0.4],[3.6,-2.62,0.3]],.08,MAT.steel(),24));g.add(cyl(.32,.32,.06,'y',MAT.dark(),3.6,-2.72,0.3,24));};
B.oilCooler=g=>{const m=MAT.orange(),hw=MAT.zinc();g.add(rbox(3.2,.6,.22,.05,m,1.8,1.25,-1.62));for(let k=0;k<9;k++)g.add(box(.04,.44,.04,m,0.6+k*0.3,1.25,-1.75));
  for(const x of[0.3,3.3])for(const y of[1.05,1.45])hex(g,x,y,-1.76,'z',.05,hw);};
B.oilFilter=g=>{g.add(rbox(.55,.25,.55,.04,MAT.alu(),1.4,0.78,-1.98));canister(g,1.4,0.66,-2.05,.3,1.0,MAT.filter());};
B.oilSensor=g=>{g.add(cyl(.07,.07,.22,'z',MAT.black(),1.95,0.78,-1.85,12));};
const FAN_BLADE=(()=>{const U=12,V=8,pos=[],idx=[];
  for(let i=0;i<=U;i++){const u=i/U,r=0.55+u*1.45,w=0.32+0.24*u,tw=0.9-0.5*u,sw=0.28*u*u;
    for(let j=0;j<=V;j++){const v=j/V-0.5,cam=0.05*(1-4*v*v),cz=v*w+sw;pos.push(cam*Math.cos(tw)+cz*Math.sin(tw),r,-cam*Math.sin(tw)+cz*Math.cos(tw));}}
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;})();
B.fan=g=>{const d=MAT.dark();g.add(cyl(.42,.42,.55,'x',d,6.3,3.6,0));g.add(box(.3,.6,.6,MAT.orange(),5.88,3.6,0));
  const f=new THREE.Group();f.position.set(6.75,3.6,0);A.fan=f;g.add(f);const bm=MAT.plastic();bm.side=THREE.DoubleSide;
  f.add(latheX([[0.001,-0.12],[0.56,-0.12],[0.6,-0.06],[0.6,0.08],[0.4,0.14],[0.001,0.16]],bm,0,0,0,48));      // moulded hub
  for(let k=0;k<10;k++){const b=mesh(FAN_BLADE,bm);b.rotation.x=k/10*Math.PI*2;f.add(b);}                   // twisted, cambered, swept blades
  const fp=new THREE.Group();fp.position.set(6.25,3.6,0);A.fanP=fp;g.add(fp);fp.add(cyl(.48,.48,.16,'x',MAT.steel(),0,0,0,36));};
B.alternator=g=>{const a=MAT.alu(),d=MAT.black(),hw=MAT.zinc(),y=1.0,z=1.95;
  // two-piece die-cast frame with cooling slots, through-bolts, mounting ears and output stud
  g.add(latheX([[0.15,0],[0.38,0],[0.42,0.05],[0.42,0.55],[0.44,0.57],[0.44,1.05],[0.4,1.12],[0.15,1.12]],a,4.66,y,z,48));
  for(const[x0,n]of[[4.9,12],[5.5,12]])for(let k=0;k<n;k++){const t=(k+0.5)/n*Math.PI*2,b=box(.26,.05,.05,d,x0,y+0.43*Math.cos(t),z+0.43*Math.sin(t));b.rotation.x=t;g.add(b);}
  for(let k=0;k<4;k++){const t=k/4*Math.PI*2+0.4;g.add(cyl(.025,.025,1.15,'x',MAT.steel(),5.22,y+0.45*Math.cos(t),z+0.45*Math.sin(t),8));}
  g.add(box(.22,.25,.16,a,4.85,y+0.5,z));g.add(box(.22,.25,.16,a,5.6,y-0.5,z));hex(g,4.85,y+0.58,z,'z',.06,hw);
  g.add(cyl(.05,.05,.16,'x',MAT.bronze(),4.58,y+0.18,z,8));hex(g,4.6,y+0.18,z,'x',.06,hw);
  const p=new THREE.Group();p.position.set(6.25,y,z);A.alt=p;g.add(p);const st=MAT.steel();
  const pv=[[0.05,-0.09],[0.2,-0.09],[0.27,-0.07]];for(let k=0;k<4;k++)pv.push([0.23,-0.05+k*0.035],[0.27,-0.035+k*0.035]);pv.push([0.27,0.09],[0.05,0.09]);p.add(latheX(pv,st,0,0,0,40));
  p.add(cyl(.05,.05,.55,'x',st,-0.32,0,0,12));hex(p,0.12,0,0,'x',.07,hw);
  for(let k=0;k<11;k++){const b=box(.06,.2,.02,a,-0.38,0.29*Math.cos(k/11*Math.PI*2),0.29*Math.sin(k/11*Math.PI*2));b.rotation.set(k/11*Math.PI*2,0.5,0);p.add(b);}};   // cooling fan
B.belt=g=>{const cs=[[0,0,.81],[2.3,-0.9,.39],[3.6,0,.51],[1.0,1.95,.29],[1.05,-1.2,.28]];const h=circlesHull(cs,64);
  const dense=[];for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length];const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.08));for(let k=0;k<n;k++)dense.push([0,a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  const bm=tube(dense,.045,MAT.rubber(),dense.length*2,true);bm.scale.x=2.4;bm.position.x=6.25;g.add(bm);
  const t=new THREE.Group();t.position.set(6.25,1.05,-1.2);A.tens=t;g.add(t);t.add(cyl(.25,.25,.18,'x',MAT.steel(),0,0,0,24));
  beamYZ(g,[1.05,-1.2],[1.4,-0.6],.12,.14,MAT.dark()).position.x=6.0;g.add(cyl(.18,.18,.25,'x',MAT.dark(),5.95,1.4,-0.6));};
B.airCompressor=g=>{const a=MAT.alu(),d=MAT.dark(),hw=MAT.zinc(),y=2.45,z=1.78;
  g.add(latheX([[0.2,0],[0.4,0],[0.42,0.05],[0.42,1.2],[0.52,1.22],[0.52,1.32],[0.2,1.32]],d,3.6,y,z,48));   // crankcase + mounting flange
  for(let k=0;k<6;k++){const t=k/6*Math.PI*2;hex(g,4.95,y+0.45*Math.cos(t),z+0.45*Math.sin(t),'x',.05,hw);}
  g.add(cyl(.28,.3,.55,'y',d,3.95,2.95,z,32));for(let k=0;k<7;k++)g.add(cyl(.38,.38,.022,'y',d,3.95,2.72+k*0.07,z,32));   // finned cylinder barrel
  g.add(rbox(.64,.24,.64,.06,a,3.95,3.34,z));for(const dx of[-0.22,0.22])for(const dz of[-0.22,0.22])hex(g,3.95+dx,3.49,z+dz,'y',.05,hw);   // head
  g.add(cyl(.08,.08,.2,'z',a,3.95,3.34,z+0.4,16));
  g.add(tube([[3.95,3.34,2.25],[3.4,3.5,2.6],[2.5,2.4,2.7],[2.0,1.2,2.45]],.06,MAT.steel(),40));};
B.starter=g=>{const d=MAT.black(),k=MAT.dark(),hw=MAT.zinc(),y=0.05,z=1.95;
  g.add(cyl(.36,.36,1.15,'x',d,-4.22,y,z,40));
  const dome=new THREE.SphereGeometry(.36,32,12,0,Math.PI*2,0,Math.PI/2);dome.rotateZ(-Math.PI/2);g.add(mesh(dome,d,-3.645,y,z));
  g.add(cyl(.3,.37,.4,'x',k,-5.0,y,z,40));g.add(rbox(.08,.95,.95,.12,k,-5.22,y,z));for(const t of[0.5,2.6,4.7])hex(g,-5.28,y+0.4*Math.cos(t),z+0.4*Math.sin(t),'x',.06,hw);
  g.add(cyl(.25,.25,.3,'x',k,-5.4,y,z));
  g.add(cyl(.19,.19,.8,'x',d,-4.55,y+0.55,z,32));g.add(cyl(.2,.2,.06,'x',k,-4.12,y+0.55,z,32));
  for(const dz of[-0.08,0.08]){g.add(cyl(.035,.035,.14,'x',MAT.bronze(),-4.03,y+0.6,z+dz,8));hex(g,-4.0,y+0.6,z+dz,'x',.045,hw);}
  for(let j=0;j<2;j++){const t=j*Math.PI+0.8;g.add(cyl(.02,.02,1.2,'x',MAT.steel(),-4.22,y+0.37*Math.cos(t),z+0.37*Math.sin(t),6));}};
B.crankSensor=g=>{g.add(cyl(.07,.07,.35,'y',MAT.black(),-5.6,2.62,0.6,12));g.add(box(.12,.1,.16,MAT.plastic(),-5.6,2.82,0.6));};
B.camSensor=g=>{g.add(cyl(.07,.07,.3,'x',MAT.black(),5.85,6.6,1.55,12));g.add(box(.1,.14,.14,MAT.plastic(),6.02,6.6,1.55));};
B.railSensor=g=>{g.add(cyl(.07,.07,.3,'x',MAT.black(),-4.62,3.9,-1.45,12));g.add(box(.12,.14,.14,MAT.plastic(),-4.82,3.9,-1.45));};
return B;
}
