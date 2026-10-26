// Caterpillar C15, 6NZ serial prefix (about 1999–2004, before ACERT): 15.2 L inline-six, 137.2 × 171.4 mm,
// MEUI unit injectors (cam-driven, ECM-controlled), single overhead cam with three rockers per cylinder,
// wastegated turbo, air-to-air aftercooled, no EGR, timing gears at the rear (flywheel end).
// The engine definition for the Engine Lab (src/engineLab/core.js): what it is, its parts and systems,
// the build sequence, how each part is drawn (builders) and what turns (spin).
// 1 scene unit = 100 mm; cylinder 1 at the front (+X); +z is the exhaust (right) side, -z the intake/fuel (left) side.

export const meta={
  id:'c15', mark:'C15', name:'Caterpillar C15 (6NZ)', maker:'Caterpillar', stand:0x3a3f46,
  sub:'15.2 L inline-six · 137.2 × 171.4 mm · MEUI unit injectors · wastegated turbo · ATAAC',
  overview:'Heavy-duty 15-litre inline-six, pre-ACERT',
  specs:[['Displacement','15.2 L (928 cu in)'],['Layout','Inline 6, 4 valves/cyl'],['Bore × stroke','137.2 × 171.4 mm (5.4 × 6.75 in)'],['Firing order','1-5-3-6-2-4'],['Valvetrain','Single overhead cam, 3 rockers per cylinder (intake, exhaust, injector)'],['Fuel','MEUI unit injectors: cam-driven, ECM-controlled'],['Air','Turbo with wastegate + air-to-air aftercooler (ATAAC)'],['Emissions','No EGR, no aftertreatment (met its era\'s limits through combustion and fuel control)'],['Timing gears','Rear (flywheel end)'],['Controls','ADEM electronic control module'],['Retarder','Compression brake (optional)'],['Serial prefix','6NZ (about 1999–2004)']],
  manual:'the Caterpillar service information (SIS) for your serial number',
  hud:{boost:'Boost ≈',rail:'Injection ≈',railVal:k=>(800+k*1000).toFixed(0)+' bar peak'},
};
export const geo={S:1.7, R:0.857, L:2.59, DECK:4.36, PH:[0,480,240,600,120,360], FIRING:[1,5,3,6,2,4], IN_PEAK:465, EX_PEAK:255, stroke:0.1714};
const INJ_PEAK=712;   // crank degrees in the cycle where the injector lobe's nose sits (just before TDC compression)

export const SYS={
  struct:{name:'Block & housings',c:'#bdb3a6'},
  rot:{name:'Rotating assembly',c:'#ff8a3d'},
  valve:{name:'Valvetrain',c:'#c7e06a'},
  fuel:{name:'Fuel system (MEUI)',c:'#ffd23f'},
  air:{name:'Air & turbo',c:'#5aa9ff'},
  exh:{name:'Exhaust',c:'#ff5d4d'},
  cool:{name:'Cooling',c:'#3fd6b0'},
  lube:{name:'Lubrication',c:'#e3a35b'},
  acc:{name:'Accessory drive',c:'#9db3c7'},
  elec:{name:'Electrical & controls',c:'#ff7bc8'},
};

/* ================= PARTS: name, function, mechanism =================
   a = label anchor (assembled), ex = explode offset, cut = how it behaves in cutaway */
export const P=[
 {id:'block',s:'struct',n:'Cylinder block',a:[-2.6,2.5,1.3],ex:[0,0,0],cut:'clip',
  fn:"The backbone of the engine. It carries the six cylinder liners, holds the crankshaft in seven main bores, and contains the coolant jackets and oil galleries every other system depends on.",
  mech:"A one-piece cast-iron block. Pressurised oil runs through drilled galleries to every main bearing and the piston cooling jets, and coolant flows around the wet liners. The deck is machined flat so one head gasket seals combustion, coolant and oil together. On the C15 the timing gear housing bolts to the rear face, not the front."},
 {id:'bearings',s:'rot',n:'Main & rod bearings',a:[0.85,-0.5,0.2],ex:[0,-1.6,0],
  fn:"Thin, replaceable steel-backed shells that the crank journals and rod big ends turn on.",
  mech:"Hydrodynamic lubrication: the spinning journal drags oil into a wedge-shaped film so metal never touches metal while running. Thrust surfaces on one main position limit crankshaft end play."},
 {id:'crankshaft',s:'rot',n:'Crankshaft',a:[-0.85,-1.0,0.9],ex:[0,-3.2,0],
  fn:"Turns the straight-line push of six pistons into rotation at the flywheel.",
  mech:"Six crankpins in three pairs (1 & 6, 2 & 5, 3 & 4) spaced 120° apart, so a cylinder fires every 120° in the order 1-5-3-6-2-4. Counterweights balance the rotating mass. Forged steel with hardened journals, running in seven main bearings. The rear end carries the crankshaft gear that drives the timing gears."},
 {id:'mainCaps',s:'struct',n:'Main bearing caps',a:[2.55,-0.7,0.6],ex:[0,-4.6,0],
  fn:"Clamp the crankshaft into the block.",
  mech:"Each cap is line-bored together with the block, so caps are numbered and fit only one position and one direction. Bolt clamp load holds the bearing shells in 'crush' so they cannot spin."},
 {id:'liners',s:'struct',n:'Cylinder liners (wet)',a:[-4.25,3.1,0.8],ex:[0,3.2,0],cut:'clip',
  fn:"Replaceable cylinder walls that the pistons slide in.",
  mech:"Wet liners: coolant touches the outside of the liner directly, and seals at the bottom keep it out of the crankcase. The top flange sits on a counterbore in the block and must stand a set amount above the deck (liner projection) so the head gasket clamps it evenly."},
 {id:'pistons',s:'rot',n:'Pistons',a:[4.25,4.5,0.3],ex:[0,5.6,0],
  fn:"Seal the bottom of the combustion chamber and pass cylinder pressure to the connecting rod.",
  mech:"A bowl in the crown shapes the air swirl so the injected fuel mixes and burns quickly. Oil jets under each piston cool the crown. Depending on the arrangement, C15s of this era used either two-piece (steel crown with a separate skirt) or one-piece pistons; SIS lists which yours takes."},
 {id:'rings',s:'rot',n:'Piston rings',a:[2.55,3.95,0.7],ex:[0,6.4,0],
  fn:"Seal compression, control oil, and carry heat from the piston into the liner.",
  mech:"The top compression ring takes most of the gas load, the second ring finishes sealing and scrapes oil down, and the oil control ring leaves a thin film on the liner wall and returns the rest through drain holes."},
 {id:'wristPins',s:'rot',n:'Piston (wrist) pins',a:[0.85,3.3,0.6],ex:[0,5.6,1.8],
  fn:"The pivot joint between piston and connecting rod.",
  mech:"A full-floating pin turns in both the piston bosses and the rod's small-end bushing. Retaining rings stop it sliding out against the liner."},
 {id:'rods',s:'rot',n:'Connecting rods',a:[-2.55,1.7,0.5],ex:[0,1.0,3.6],
  fn:"Link each piston to its crankpin.",
  mech:"A slider-crank: the rod angle swings as the crank turns, turning straight-line force into torque, greatest roughly 70–90° after top dead centre. Each cap is matched to its own rod and must go back on that rod, the same way round."},
 {id:'flywheel',s:'rot',n:'Flywheel & ring gear',a:[-6.7,-1.3,1.3],ex:[-6.8,0,0],
  fn:"Stores energy to smooth out the gaps between power strokes, carries the starter ring gear, and mounts the clutch.",
  mech:"Its inertia resists speed changes: it absorbs energy on each power stroke and gives it back while the other cylinders compress. A hole in the flywheel lines up with the timing bolt hole in the housing at No. 1 top dead centre."},
 {id:'flywheelHousing',s:'struct',n:'Flywheel housing & rear seal',a:[-6.3,2.7,1.5],ex:[-5.0,0,0],cut:'clip',
  fn:"Encloses the flywheel, bolts the transmission to the engine, covers the lower rear gears, and holds the starter and rear crankshaft seal.",
  mech:"Its bore and face must run true to the crankshaft centreline so the transmission input shaft lines up; both are checked with a dial indicator. It carries the timing bolt used to lock the flywheel at No. 1 top dead centre when setting timing, lash and injectors."},
 {id:'damper',s:'rot',n:'Vibration damper & pulley',a:[6.1,-1.15,0.5],ex:[6.0,0,0],
  fn:"Controls crankshaft torsional vibration and drives the belt.",
  mech:"A heavy inertia ring floats in viscous fluid inside a sealed housing. When the crankshaft twists back and forth, the fluid shears and turns that vibration into heat. A dented, leaking or swollen damper must be replaced."},
 {id:'gearTrain',s:'rot',n:'Rear gear train',a:[-5.5,1.4,1.0],ex:[-3.4,0,0],
  fn:"Drives the camshaft and the gear-driven accessories, such as the air compressor, in exact time with the crankshaft, from the flywheel end of the engine.",
  mech:"Crankshaft gear → idlers → camshaft gear at the back of the head, with another idler out to the air compressor drive. Idlers change only direction and distance, not timing. The flywheel end of the crankshaft twists the least, which helps keep valve and injection timing steady. Timing marks on the gears set it all at No. 1 TDC."},
 {id:'camGear',s:'valve',n:'Camshaft gear',a:[-5.5,6.8,0.9],ex:[-3.4,11.6,0.6],
  fn:"Turns the overhead camshaft at exactly half crankshaft speed, and with it every valve and injector event.",
  mech:"It has twice the teeth of the crank gear (32 vs 16 in the lab), so the cam turns once for every two crank turns: one full four-stroke cycle. Its marks line up with the idler at No. 1 TDC; SIS gives the timing pin or marks for your serial. In the lab the access cover over it is left off so you can see it."},
 {id:'gearHousing',s:'struct',n:'Rear timing gear housing',a:[-5.3,4.4,-1.8],ex:[-1.8,0,0],cut:'clip',
  fn:"Locates the gear train shafts at the rear of the block and head, and carries the flywheel housing and rear-mounted accessories.",
  mech:"Dowel-located to the block so the idler shafts hold the right gear centre distances, which sets backlash. The air compressor bolts to it and is driven through it."},
 {id:'frontCover',s:'struct',n:'Front housing & seal',a:[5.5,1.2,-1.5],ex:[2.6,0,0],cut:'clip',
  fn:"Closes the front of the block, holds the front crankshaft seal, and carries front-mounted parts such as the water pump.",
  mech:"With the timing gears at the rear, the front of a C15 is mostly accessory drive. The lip seal rides on the crankshaft or damper hub; correct installed depth and a clean, unworn sealing surface keep it dry."},
 {id:'oilPan',s:'lube',n:'Oil pan (sump)',a:[1.5,-2.4,1.4],ex:[0,-6.9,0],cut:'clip',
  fn:"The engine oil reservoir and the lower seal of the crankcase.",
  mech:"Oil drains back here from the whole engine. The sump shape and baffles keep the pickup covered when the truck brakes, climbs or descends."},
 {id:'headGasket',s:'struct',n:'Cylinder head gasket',a:[2.2,4.4,1.3],ex:[0,7.2,0],cut:'clip',
  fn:"Seals combustion gas, coolant and oil between block and head.",
  mech:"Raised sealing beads and rings concentrate clamp force around each bore and passage. It only seals if liner projection is right and the head bolts are tightened to the SIS sequence."},
 {id:'head',s:'struct',n:'Cylinder head',a:[-1.0,5.3,1.33],ex:[0,8.2,0],cut:'clip',
  fn:"Closes the top of the cylinders and holds the valves, the six unit injectors, the overhead camshaft and the fuel supply gallery.",
  mech:"A one-piece cross-flow head: air enters on the left (intake) side and exhaust leaves on the right. Each injector sits in a sleeve that seals it from the coolant around it. A passage drilled lengthwise through the head carries low-pressure fuel to every injector bore."},
 {id:'valveCover',s:'struct',n:'Valve cover & base',a:[-2.0,7.6,0.3],ex:[0,15.5,0],cut:'clip',
  fn:"Seals the top of the engine over the camshaft, rockers, injectors and engine brake.",
  mech:"A base (spacer) raises the cover high enough to clear the brake housings. The injector solenoid wiring runs under the cover and leaves through a sealed pass-through connector. Oil thrown off the rockers lubricates the valvetrain and drains back to the pan."},
 {id:'valves',s:'valve',n:'Intake & exhaust valves',a:[2.9,4.55,0.3],ex:[0,7.4,0],
  fn:"Open and close the ports: two intake and two exhaust valves per cylinder, 24 in total.",
  mech:"Poppet valves held shut on hardened seats by spring force and pushed open by the cam through a rocker and bridge. Exhaust valves use heat-resistant alloy because they sit in the hottest gas."},
 {id:'springs',s:'valve',n:'Valve springs & retainers',a:[0.52,5.95,0.3],ex:[0,8.9,0],
  fn:"Close the valves and keep the valvetrain following the cam profile.",
  mech:"Spring preload has to overcome valvetrain inertia at governed speed; if it doesn't, the valve 'floats' and can hit the piston. Split keepers lock the retainer to the valve stem."},
 {id:'crossheads',s:'valve',n:'Valve bridges',a:[-1.18,6.2,0.36],ex:[0,9.8,0],
  fn:"Let one rocker arm open two valves at once.",
  mech:"A bridge across the two valve stems: the rocker presses the middle and both valves open evenly. The bridge is adjusted so it contacts both stems at once before valve lash is set."},
 {id:'camshaft',s:'valve',n:'Overhead camshaft',a:[3.0,6.3,0.95],ex:[0,11.6,0.6],
  fn:"Times every valve event and drives every injector.",
  mech:"Single overhead cam with three lobes per cylinder: intake, exhaust, and a larger injector lobe whose nose comes up around top dead centre on compression. Because the injector lobe has to push the injector plunger against injection pressure, the cam, its bearings and its gear carry far more load than on a common-rail engine."},
 {id:'rockers',s:'valve',n:'Valve rocker arms & shaft',a:[-2.9,6.65,0.45],ex:[0,12.6,0],
  fn:"Carry cam lift across to the intake and exhaust valve bridges.",
  mech:"Roller-follower arms pivot on a shaft. When the lobe lifts the roller, the other end presses the bridge down and the valves open. An adjusting screw and locknut set the lash with the roller on the cam's base circle."},
 {id:'injRockers',s:'valve',n:'Injector rocker arms',a:[-1.0,6.75,0.1],ex:[0,13.1,0.5],
  fn:"Push each unit injector's plunger down once per cycle, timed by the cam's injector lobe.",
  mech:"A third, heavier rocker per cylinder sits between the intake and exhaust rockers on the same shaft and rides the injector lobe on a roller. Its adjusting screw sets the injector's position at rest, so the plunger gets its full stroke without bottoming. It is set at the crank positions SIS lists, by the method SIS gives for your serial."},
 {id:'brake',s:'valve',n:'Compression brake housings',a:[-4.0,7.25,0.45],ex:[0,14.2,0],
  fn:"An optional compression (Jacobs-style) brake that slows the truck without using the service brakes.",
  mech:"When the driver switches it on, a solenoid sends engine oil into the housing. A master piston, driven by the valvetrain (on unit-injector engines typically the injector rocker, whose stroke falls near top dead centre), pumps that oil to a slave piston that cracks the exhaust valves open just before top dead centre on compression. The compressed air escapes, so its energy is lost instead of pushing the piston back down."},
 {id:'transferPump',s:'fuel',n:'Fuel transfer pump',a:[-3.25,0.7,-2.4],ex:[0,-0.8,-3.6],
  fn:"Pulls fuel from the tank through the primary filter and water separator, and pushes it at low pressure through the secondary filter to the cylinder head.",
  mech:"A positive-displacement gear pump driven by the engine; a relief valve limits its pressure. It only supplies fuel: the high injection pressure is made inside each injector. Where it mounts and how it is driven depend on the arrangement; SIS shows yours."},
 {id:'fuelFilter',s:'fuel',n:'Fuel filter base, primer & filter',a:[-1.0,1.3,-2.3],ex:[0,-1.5,-3.6],
  fn:"Removes fine dirt before fuel reaches the injectors, and lets you prime the system by hand.",
  mech:"Unit injector plungers and nozzles are made to very tight clearances, so fine filtration is critical. The priming pump on the base pushes fuel through the filter and up to the head to purge air after a filter change or running out of fuel. A primary filter with a water separator is usually mounted on the chassis ahead of the transfer pump."},
 {id:'fuelGallery',s:'fuel',n:'Fuel supply gallery & lines',a:[3.4,4.3,-1.7],ex:[0,4.0,-3.4],
  fn:"Feeds low-pressure fuel to all six injectors and carries the unused fuel back to the tank.",
  mech:"A passage drilled lengthwise through the head meets each injector bore, so fuel surrounds every injector. Far more fuel flows through than is burned: the surplus cools the injectors and sweeps out air, then leaves through a pressure-regulating valve that holds gallery pressure, and returns to the tank."},
 {id:'injectors',s:'fuel',n:'MEUI unit injectors',a:[0.85,6.2,0],ex:[0,10.6,0],
  fn:"Each one is a pump and nozzle in one: it raises fuel to injection pressure and sprays it into its cylinder.",
  mech:"The injector rocker pushes the plunger down. While the spill valve is open, fuel just flows back to the gallery. When the ECM energises the solenoid the valve closes, pressure builds at once and lifts the nozzle needle, and fuel sprays through the tip holes. When the solenoid lets go, pressure collapses and injection stops. The start of the signal sets timing; its length sets the amount."},
 {id:'intakeManifold',s:'air',n:'Intake manifold',a:[1.7,5.55,-1.6],ex:[0,8.2,-2.6],
  fn:"Distributes cooled charge air evenly to all six intake ports.",
  mech:"Boosted air from the aftercooler enters at the front and feeds each intake port in the head. Boost pressure and inlet air temperature are measured here for fuelling."},
 {id:'intakeConnection',s:'air',n:'Air inlet elbow',a:[5.1,5.65,-1.65],ex:[1.5,8.2,-2.6],
  fn:"Connects the charge-air pipe from the aftercooler to the front of the intake manifold.",
  mech:"A cast elbow with a hose or clamp joint. A leak here lets boost escape and dirt in, so it is pressure-tested with the rest of the charge-air system."},
 {id:'exhaustManifold',s:'exh',n:'Exhaust manifold (3-piece)',a:[3.0,5.3,1.95],ex:[0,8.2,2.6],cut:'ghost',
  fn:"Collects exhaust from all six cylinders and feeds it to the turbine.",
  mech:"Built in sections with slip joints so it can grow with heat without cracking or snapping studs."},
 {id:'turbine',s:'exh',n:'Turbine housing & wheel',a:[-0.4,6.2,3.25],ex:[0,8.2,4.6],cut:'ghost',
  fn:"Recovers energy from the exhaust to drive the compressor.",
  mech:"Hot exhaust expands through the turbine wheel and spins the shaft. This is fixed-geometry: the housing's flow area never changes, so a wastegate port in the housing lets some exhaust bypass the wheel when boost reaches its limit."},
 {id:'chra',s:'air',n:'Turbo centre (bearing) housing',a:[0.12,5.05,3.3],ex:[0,8.2,5.4],cut:'ghost',
  fn:"Holds the bearings that carry the turbo shaft.",
  mech:"Engine oil floats the shaft on thin oil films at tens of thousands of rpm, then drains back to the crankcase by gravity. A few seconds without oil can destroy it."},
 {id:'compressor',s:'air',n:'Turbo compressor',a:[0.8,5.0,3.45],ex:[0,8.2,6.2],cut:'ghost',
  fn:"Packs more air into the cylinders (boost).",
  mech:"The compressor wheel shares a shaft with the turbine. It flings air outward into the volute, which turns speed into pressure. Compression heats the air, so it goes through the aftercooler before reaching the engine."},
 {id:'wastegate',s:'air',n:'Wastegate & actuator',a:[0.5,4.3,3.75],ex:[0,7.4,6.4],cut:'ghost',
  fn:"Limits boost by letting some exhaust bypass the turbine wheel.",
  mech:"Boost pressure from the compressor outlet acts on a diaphragm in the actuator canister against a spring. Past its set point it pushes the rod, which opens a valve in the turbine housing, so part of the exhaust skips the wheel and turbo speed levels off. A sticking valve or leaking hose shows up as low or excessive boost."},
 {id:'chargePipes',s:'air',n:'Air inlet & charge-air pipes',a:[4.0,6.95,2.65],ex:[0,8.2,7.2],cut:'ghost',
  fn:"Plumbing from the air cleaner to the turbo, from the turbo to the air-to-air aftercooler, and back to the intake.",
  mech:"ATAAC: hot boosted air leaves the compressor, cools in the chassis-mounted air-to-air aftercooler ahead of the radiator, then returns denser to the air inlet elbow. A leak lowers boost and raises exhaust temperature."},
 {id:'exhaustOutlet',s:'exh',n:'Exhaust outlet',a:[-2.2,3.3,3.05],ex:[-1.5,6.0,5.0],cut:'ghost',
  fn:"Carries exhaust from the turbine to the truck's exhaust system.",
  mech:"On a 6NZ C15 the exhaust goes to the muffler: the engine predates EGR and diesel particulate filters, and met its emissions standard through combustion design and precise electronic fuel control."},
 {id:'waterPump',s:'cool',n:'Water pump',a:[5.9,2.6,-1.5],ex:[4.4,0,-0.6],
  fn:"Circulates coolant through the block, head and oil cooler.",
  mech:"A centrifugal impeller driven from the front of the engine; flow rises with engine speed. A weep hole shows when the shaft seal starts to leak."},
 {id:'thermostat',s:'cool',n:'Thermostat housing',a:[5.45,5.55,-1.1],ex:[3.0,8.2,-0.6],
  fn:"Keeps the engine at operating temperature.",
  mech:"Wax-pellet thermostats. When coolant reaches their rated temperature the wax melts and expands, opening the path to the radiator. Until then coolant bypasses straight back to the pump so the engine warms up quickly."},
 {id:'oilPump',s:'lube',n:'Oil pump & pickup',a:[4.0,-1.2,0.5],ex:[0,-6.0,0],
  fn:"Pressurises the lubrication system.",
  mech:"A gear-driven positive-displacement pump pulls oil through the pickup screen. A relief valve limits pressure and sends the excess back to the pan."},
 {id:'oilCooler',s:'lube',n:'Oil cooler',a:[1.8,1.7,-1.75],ex:[0,0,-2.6],
  fn:"Uses engine coolant to remove heat from the oil.",
  mech:"A heat exchanger on the left side of the block: oil and coolant pass through separate passages with a lot of surface between them. A leak inside it mixes oil and coolant."},
 {id:'oilFilter',s:'lube',n:'Oil filter',a:[1.4,-0.45,-2.1],ex:[0,-1.5,-3.2],
  fn:"Cleans the oil before it reaches the bearings.",
  mech:"A spin-on filter. If it plugs, a bypass valve still lets oil through so the bearings are never starved, though that oil is unfiltered."},
 {id:'fan',s:'cool',n:'Fan hub & fan',a:[6.75,5.7,0],ex:[8.6,0,0],cut:'ghost',
  fn:"Pulls air through the radiator and aftercooler.",
  mech:"A clutch in the hub engages the fan only when cooling is needed, which saves horsepower and fuel. On a truck the fan drive is part of the chassis installation."},
 {id:'alternator',s:'elec',n:'Alternator',a:[5.2,1.5,2.25],ex:[6.0,0,2.0],cut:'ghost',
  fn:"Charges the batteries and powers the truck's electrics.",
  mech:"Belt-driven. A spinning magnetic field induces AC in the stator windings, and diodes rectify it to DC."},
 {id:'belt',s:'acc',n:'Belt & tensioner',a:[6.25,0.95,1.0],ex:[7.0,0,0],
  fn:"Drives the fan and alternator from the crank pulley.",
  mech:"A poly-V belt. The spring-loaded tensioner keeps tension constant as the belt wears and stretches. Routing varies with the truck's installation."},
 {id:'airCompressor',s:'acc',n:'Air brake compressor',a:[-4.5,1.9,-2.5],ex:[0,0,-3.4],
  fn:"Supplies compressed air for the truck's air brakes and suspension.",
  mech:"A piston compressor driven by the rear gear train, bolted to the rear housing on the left side. A governor tells it when to pump and when to unload."},
 {id:'starter',s:'elec',n:'Starter motor',a:[-5.2,0.55,2.25],ex:[-5.0,0,2.6],cut:'ghost',
  fn:"Cranks the engine for starting.",
  mech:"An electric motor. The solenoid pushes the pinion into the flywheel ring gear, then closes the high-current contacts."},
 {id:'ecm',s:'elec',n:'ADEM engine control module',a:[-3.0,3.65,-1.5],ex:[0,0,-3.8],
  fn:"The engine's computer. It decides when and how long to fire each injector, and runs the engine protection, governor and brake logic.",
  mech:"It reads the speed/timing, boost, temperature and pressure sensors, works out injection timing and quantity, and switches each injector solenoid. The rating, injector trim and customer parameters are set with Cat ET."},
 {id:'crankSensor',s:'elec',n:'Engine speed/timing sensor',a:[-6.35,3.2,0.6],ex:[-5.4,0.8,0.8],cut:'ghost',
  fn:"Tells the ECM engine speed and exactly where the crankshaft is.",
  mech:"A sensor reading a toothed timing wheel turned in time with the crankshaft. An odd spot in the tooth pattern marks a reference, so the ECM knows which piston is coming up. Where the sensors sit and which wheel they read depends on the serial: check SIS before you go looking."},
 {id:'camSensor',s:'elec',n:'Second speed/timing sensor',a:[-5.45,7.4,1.55],ex:[-3.4,1.2,0.6],cut:'ghost',
  fn:"Tells the ECM which part of the 720° cycle the engine is in, and backs up the other sensor.",
  mech:"Top dead centre comes round twice per cycle, once on compression and once on exhaust. A signal tied to camshaft (half) speed tells them apart, so the right injector fires. If one sensor signal is lost the ECM can usually keep running on the other and logs a code."},
 {id:'imap',s:'elec',n:'Boost & inlet air temp sensors',a:[0.3,5.85,-1.6],ex:[0,8.8,-2.6],
  fn:"Measure boost pressure and charge-air temperature.",
  mech:"The ECM uses them to work out how much air is in the cylinders and limit fuel to match, which keeps smoke down while the turbo comes up to speed."},
 {id:'coolantSensor',s:'elec',n:'Coolant temperature sensor',a:[5.45,5.85,-0.6],ex:[3.0,8.8,-0.6],
  fn:"Measures engine coolant temperature.",
  mech:"A thermistor whose resistance changes with temperature. Used for cold-start fuelling, fan control and engine protection."},
 {id:'oilSensor',s:'elec',n:'Oil pressure sensor',a:[1.95,0.95,-1.9],ex:[0,-0.5,-3.0],
  fn:"Measures engine oil pressure.",
  mech:"Drives the gauge and engine protection: low oil pressure for the engine speed triggers a warning, derate or shutdown, depending on how the ECM is programmed."},
 {id:'fuelSensor',s:'elec',n:'Fuel pressure sensor',a:[-0.82,1.45,-2.25],ex:[0,-0.6,-4.0],
  fn:"Measures fuel supply pressure after the filter.",
  mech:"Low supply pressure points to a plugged filter, an air leak on the suction side, or a weak transfer pump. The ECM logs it and can derate the engine to protect it."},
];


/* ================= BUILD PROCESS (out-of-frame build on a stand) ================= */
export const STEPS=[
 {t:'Prepare the cylinder block',p:['block'],why:"Everything locates off the block, so it is cleaned, inspected and measured before a single part goes on.",
  std:["Hot-tank or wash; blow out every oil gallery, piston cooling jet passage and coolant passage","Pressure-test for cracks","Check deck flatness with a straightedge and feeler gauge","Inspect main bores and liner counterbores for damage, and measure counterbore depth","Chase threads and fit new plugs"]},
 {t:'Upper main bearing shells',p:['bearings'],why:"Shells go in before the crank. Their positions and oil holes are only visible with the crank out.",
  std:["Shell backs and block bores clean and dry","Locating tabs seated in their notches; oil holes lined up with the block feeds","Thrust surfaces in the position SIS specifies","Lubricate bearing faces with clean engine oil"]},
 {t:'Crankshaft',p:['crankshaft'],why:"The crank sets the reference for every rotating and timing part that follows.",
  std:["Measure every journal for diameter, taper and out-of-round","Crack-check and inspect journal finish","Lower in level with a lifting fixture; never let a journal hit a shell edge"]},
 {t:'Main bearing caps',p:['mainCaps'],why:"Clamping the crank now lets you confirm it turns freely and has correct end play before anything else drags on it.",
  std:["Caps in numbered positions, facing the right way","Lubricate bolt threads and under the heads as SIS specifies","Tighten in the SIS sequence and stages","Crank must turn by hand; measure end play with a dial indicator"]},
 {t:'Cylinder liners',p:['liners'],why:"Liner projection must be measured on the bare block. It decides whether the head gasket will seal.",
  std:["New liner seals, lubricated only with what SIS specifies","Install with the liner tool; never hammer","Clamp down and measure projection at several points on each liner","Projection in spec, and within spec of the neighbouring liners"]},
 {t:'Piston & rod assemblies',p:['pistons','rings','wristPins','rods'],why:"Pistons go in after the liners are set and before the head closes off the top.",
  std:["Check ring end gap in the liner","Fit rings with an expander, identification marks up, gaps staggered","New pin retaining rings, fully seated in their grooves","Piston orientation mark toward the front","Use a ring compressor and guide the rod onto the journal without nicking it","Each cap back on its own rod; tighten as SIS specifies; check side clearance","Make sure every piston cooling jet is in place and aimed correctly"]},
 {t:'Rear timing gear housing',p:['gearHousing'],why:"On the C15 the gears live at the flywheel end. The housing carries the idler shafts, so it must be on and true before any gear goes in.",
  std:["Clean mating faces; apply the sealant SIS specifies","Seat on dowels; tighten in sequence","New seals wherever accessories will drive through it"]},
 {t:'Rear gear train',p:['gearTrain'],why:"No. 1 is set at top dead centre now, and every later timing step references these marks.",
  std:["Crank gear and idlers fitted; idler shafts and bushings lubricated","No. 1 piston at TDC with the gear timing marks aligned","Measure backlash and idler end play with a dial indicator"]},
 {t:'Flywheel housing & rear seal',p:['flywheelHousing'],why:"It closes off the lower gears and carries the rear seal, and must be on before the flywheel.",
  std:["Sealant on the mating face as specified","Install the new rear seal to the correct depth with its installer","Dial-indicate housing bore and face runout to the crankshaft"]},
 {t:'Flywheel',p:['flywheel'],why:"Fitted once the housing is aligned, so runout can be measured against a true reference.",
  std:["Clean the crank flange and flywheel bore","New bolts if SIS calls for them; tighten in a cross pattern","Measure flywheel face and bore runout","Confirm the timing bolt goes into the flywheel at No. 1 TDC"]},
 {t:'Front housing & seal',p:['frontCover'],why:"Closes the front of the block before the oil pan seals against it.",
  std:["Sealant or gasket as SIS specifies; seat on dowels","Fit the new front seal with its installer, following the seal's lubrication instructions"]},
 {t:'Oil pump & pickup',p:['oilPump'],why:"The pump mounts low in the crankcase and is only reachable before the pan goes on.",
  std:["Prime the pump with clean oil","New pickup seal; support brackets tight","Check drive gear backlash"]},
 {t:'Oil pan',p:['oilPan'],why:"Closes the bottom end once everything inside has been measured and checked.",
  std:["New gasket; sealant at the housing joints only where specified","Tighten in the SIS sequence"]},
 {t:'Cylinder head gasket',p:['headGasket'],why:"Fitted only after liner projection has been confirmed.",
  std:["Deck and head faces clean and dry","No oil or coolant left in bolt holes (it can hydraulic-lock and crack the block)","Gasket fitted dry on its dowels, the right way up"]},
 {t:'Cylinder head assembly',p:['head','valves','springs'],why:"Valves, springs and new injector sleeves are fitted to the head on the bench, then the whole assembly is lifted on.",
  std:["Pressure-test the head and check flatness","Replace injector sleeves if SIS calls for it, and pressure-test after","Recondition valve seats and faces; measure valve depth below the head face","Test spring free length and load","Lubricate head bolts as SIS specifies; tighten in sequence and stages"]},
 {t:'Valve bridges',p:['crossheads'],why:"They sit on the valve stems and must be adjusted before the rockers go on.",
  std:["Each bridge sits squarely on both valve stems","Adjust each bridge so it contacts both stems evenly, as SIS describes","Lubricate the contact faces"]},
 {t:'Unit injectors',p:['injectors'],why:"Injectors go into their sleeves before the camshaft and rockers cover their bores.",
  std:["Clean the injector bores and sleeves; new O-rings on every injector, lubricated as SIS specifies","Seat each injector squarely; fit and tighten the hold-down","Record each injector's serial and trim code for the ECM","Keep the fuel gallery and every injector opening covered until the head is closed up"]},
 {t:'Camshaft & cam gear',p:['camshaft','camGear'],why:"The cam is timed to the crank through the rear gear train already set at No. 1 TDC.",
  std:["Coat lobes and journals with assembly lube","No. 1 at TDC (timing bolt in the flywheel); lock the cam with its timing pin or align its marks as SIS shows","Fit the cam gear with the marks aligned; tighten as specified","Measure cam end play and gear backlash"]},
 {t:'Valve rocker arms & shaft',p:['rockers'],why:"The valve rockers and shaft go on once the cam and bridges are in.",
  std:["Lubricate shafts and rollers","Back off all adjusting screws before tightening the shaft","Tighten the shaft bolts in sequence, rolling the cam so no rocker is forced"]},
 {t:'Injector rockers, valve lash & injector setting',p:['injRockers'],why:"With all three rockers on, lash and injectors are set together at the two crank positions SIS gives.",
  std:["No. 1 at TDC compression with the timing bolt in: set the valves and injectors SIS lists for that position","Remove the bolt, turn the crankshaft 360° in the direction of rotation, refit the bolt, and set the rest","Set valve lash with a feeler gauge with each roller on the cam's base circle","Set each injector by the method SIS gives for your serial (on this family typically: screw down to contact, then a set amount further)","Recheck after tightening every locknut; remove the timing bolt before turning the engine"]},
 {t:'Compression brake',p:['brake'],why:"The brake housings sit over the finished rockers, and their slave lash is set off the finished valve lash.",
  std:["Housings on with new seals; studs and bolts tightened as specified","Set slave piston lash at the positions SIS gives","Solenoid wiring routed clear of the rockers"]},
 {t:'Valve cover & base',p:['valveCover'],why:"Seals the top end once lash, injectors and brake have been set and checked.",
  std:["Injector harness clipped clear of moving parts; pass-through connector sealed","New gaskets on the base and cover","Tighten in sequence; don't crush isolated gaskets"]},
 {t:'Vibration damper & pulley',p:['damper'],why:"Fitted once the front housing and seal are in.",
  std:["Inspect the damper and discard it if dented, leaking or out of thickness spec","Clean the seal surface on the hub","Tighten the bolts in a cross pattern"]},
 {t:'Low-pressure fuel system',p:['transferPump','fuelFilter','fuelGallery'],why:"Fuel parts go on late so they stay sealed and clean as long as possible.",
  std:["Absolute cleanliness: uncap each port only when it is connected","Transfer pump drive and seal in good condition","New secondary fuel filter","Supply line to the head and return line with its pressure-regulating valve tight; every clamp fitted"]},
 {t:'Intake manifold & inlet elbow',p:['intakeManifold','intakeConnection'],why:"Closes off the intake ports on the left side of the head.",
  std:["New gaskets; tighten in sequence","Check for debris in the ports before fitting"]},
 {t:'Exhaust manifold',p:['exhaustManifold'],why:"The base the turbocharger mounts on.",
  std:["New gaskets; high-temperature anti-seize on the studs","Slip joints assembled free to move","Tighten in sequence; re-tighten after a heat cycle if SIS specifies"]},
 {t:'Turbocharger & wastegate',p:['turbine','chra','compressor','wastegate'],why:"Mounted on the finished exhaust manifold, with oil feed and drain lines from the block.",
  std:["Check shaft axial and radial play; inspect both wheels for damage","Pre-lube the centre housing with clean oil through the feed port","New gaskets; the oil drain must run downhill with no kinks","Wastegate valve moves freely; actuator hose and rod connected as SIS shows"]},
 {t:'Air & exhaust plumbing',p:['chargePipes','exhaustOutlet'],why:"Connects the turbo to the air cleaner, the aftercooler and the exhaust.",
  std:["Clamps tightened; pressure-test the charge-air system","Exhaust clamp seated evenly all the way around"]},
 {t:'Cooling & lube components',p:['waterPump','thermostat','oilCooler','oilFilter'],why:"External components that complete the coolant and oil circuits.",
  std:["New seals and gaskets","Oil cooler pressure-tested","New oil filter, filled as SIS specifies"]},
 {t:'Accessory drive',p:['fan','alternator','belt','airCompressor'],why:"Goes on after the damper and the housings these accessories bolt to.",
  std:["Air compressor drive gear and seal in good condition; check backlash","Check pulley alignment","Belt routed correctly; tensioner moves freely through its range"]},
 {t:'Starter, ECM & sensors',p:['starter','ecm','crankSensor','camSensor','imap','coolantSensor','oilSensor','fuelSensor'],why:"Electronics go on last so they can't be damaged during heavy assembly.",
  std:["Sensors clean, new O-rings, correct air gap or seating where SIS specifies","Harness connectors fully latched; ECM isolators in good condition","Battery cables and ground straps clean and tight","With Cat ET, load the injector trim files for the installed injectors and run any calibration SIS calls for"]},
 {t:'First start & commissioning',p:[],why:"The engine is complete. These checks protect a fresh build in its first minutes.",
  std:["Fill with oil and coolant; bleed air from the cooling system","Prime the fuel system with the priming pump until it is free of air","Pre-lube until oil pressure shows before firing","Start and idle; confirm oil pressure immediately and check for leaks everywhere","Check for active codes with Cat ET, warm up, recheck levels and any re-tighten items"]},
];


export const flows=X=>[
 {k:'Air',c:0x5aa9ff,pts:[[7.6,5.3,3.4],[4.5,5.4,3.4],[2.6,5.5,3.3],[1.4,5.45,2.95],[0.8,5.45,2.95],[0.7,5.97,3.05],[0.7,6.33,3.3],[1.3,6.75,2.85],[3,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]]},
 {k:'Air',c:0x7cc0ff,pts:[[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.0,5.25,-1.6],[4.5,5.2,-1.56],[-4.6,5.2,-1.56]]},
 {k:'Exhaust',c:0xff5d4d,pts:[[4.4,4.95,1.85],[-0.4,4.95,1.85],[-0.4,5.0,2.3],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]]},
 {k:'Exhaust',c:0xff7a4d,pts:[[-4.4,4.95,1.85],[-0.4,4.95,1.85],[-0.4,5.0,2.3],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]]},
 // tank → transfer pump → secondary filter → up to the head → along the drilled gallery → regulating valve → return to tank
 {k:'Fuel',c:0xffd23f,pts:[[-3.8,-0.35,-2.55],[-3.85,0.0,-2.35],[-3.6,0.25,-2.0],[-2.9,0.3,-2.0],[-2.3,0.55,-2.25],[-1.28,0.75,-2.05],[-0.72,0.8,-2.05],[0.0,2.0,-2.1],[2.5,3.9,-1.9],[4.0,4.45,-1.62],[4.25,4.75,-1.42],[4.25,4.8,-0.95],[-4.25,4.8,-0.95],[-4.25,4.75,-1.5],[-4.5,4.5,-1.9],[-4.55,3.9,-2.15],[-4.4,3.0,-2.2]]},
 ...[1,2,3,4,5,6].map(i=>({k:'Fuel',c:0xffe27a,n:10,pts:[[X(i),4.8,-0.95],[X(i),4.8,-0.5],[X(i),4.8,-0.14],[X(i),4.55,-0.02],[X(i),4.4,0]]})),
 {k:'Coolant',c:0x3fd6b0,pts:[[6.0,1.0,-1.8],[5.75,1.6,-1.45],[5.72,2.1,-1.0],[5.3,2.0,-1.2],[3.6,1.3,-1.62],[0.2,1.3,-1.62],[-4.6,2.5,-0.95],[-4.8,4.1,-0.95],[-4.6,5.0,-0.6],[4.6,5.0,-0.6],[5.45,5.1,-0.85],[5.45,5.3,-0.85],[6.35,5.3,-0.85]]},
 {k:'Oil',c:0xe3a35b,pts:[[3.6,-2.65,0.3],[4.0,-2.2,0.4],[4.0,-1.5,0.3],[3.4,-0.9,-1.1],[2.6,1.1,-1.62],[1.4,0.78,-1.98],[1.4,0.0,-2.05],[1.15,0.7,-1.8],[0.0,0.95,-1.35],[-4.8,0.95,-1.35],[-4.8,5.0,-0.3],[-4.8,6.5,0.45],[4.8,6.5,0.45]]},
];

/* injector plunger travel (scene units) at cycle angle c (crank degrees): matches the injector lobe drawn in builders */
function injLift(c){let d=c-INJ_PEAK;d=((d+360)%720+720)%720-360;return Math.abs(d)<80?0.12*Math.cos(Math.PI/2*d/80)**2:0;}

// Turning parts other than the crank, rods, pistons and valves (the core moves those). th = crank angle in radians, deg = in degrees.
export function spin(A,th,deg){
  A.gC.rotation.x=th;A.gA.rotation.x=-th*16/30;A.gB.rotation.x=th*16/48;A.gCam.rotation.x=-th/2;A.cam.rotation.x=-th/2;
  A.gX.rotation.x=-th*16/23;A.gAC.rotation.x=th;
  A.fan.rotation.x=th*1.15;A.fanP.rotation.x=th*1.15;A.wp.rotation.x=th*1.4;A.alt.rotation.x=th*3.1;A.tens.rotation.x=th*3.0;
  A.turb.rotation.x=th*9;A.comp.rotation.x=th*9;
  const d=deg===undefined?th*180/Math.PI:deg;
  for(let i=0;i<6;i++){const c=((d-geo.PH[i])%720+720)%720,lj=injLift(c);
    A.rkJ[i].rotation.x=-lj/0.45;A.injT[i].position.y=-lj;A.injS[i].scale.y=(0.22-lj)/0.22;}
}

export function builders(h){
const {THREE,D2R,X,S,R,L,DECK,PH,IN_PEAK,EX_PEAK,A,FXMAT,GLOW,MAT,TX,mesh,box,rbox,cyl,hex,torus,tube,shapeYZ,extrudeX,beamYZ,gearGeo,circlesHull,Helix,latheX,voluteGeo,lobe,webShape,canister}=h;
const B={};
A.rkJ=[];A.injT=[];A.injS=[];
/* Caterpillar yellow paint */
const YEL=()=>new THREE.MeshPhysicalMaterial({color:0xf2b20c,roughness:.48,metalness:.05,map:TX.mottle,bumpMap:TX.cast,bumpScale:.6,clearcoat:.9,clearcoatRoughness:.14});

/* rear gear train geometry: crank 16T, idler A 30T, idler B 48T, cam 32T (2:1); idler C 23T out to the air compressor drive 16T */
const GX=-5.43;
const GR={crank:0.48,A:0.9,B:1.44,cam:0.96,C:0.69,ac:0.48};
const GC={crank:[0,0],A:[1.3,0.46],cam:[5.95,0.9],C:[0.25,-1.155],ac:[0.95,-2.1]};
(()=>{const[ay,az]=GC.A,[cy,cz]=GC.cam,dy=cy-ay,dz=cz-az,d=Math.hypot(dy,dz),R1=GR.A+GR.B,R2=GR.B+GR.cam;const a=(d*d+R1*R1-R2*R2)/(2*d),hh=Math.sqrt(Math.max(0,R1*R1-a*a)),uy=dy/d,uz=dz/d;GC.B=[ay+a*uy+hh*uz,az+a*uz-hh*uy];})();
const housingHull=circlesHull([[0,0,0.75],[...GC.A,GR.A+0.22],[...GC.B,GR.B+0.22],[...GC.cam,GR.cam+0.22],[...GC.C,GR.C+0.22],[...GC.ac,GR.ac+0.22]]);
const lowerHull=circlesHull([[0,0,0.75],[...GC.A,GR.A+0.22],[...GC.C,GR.C+0.22],[...GC.ac,GR.ac+0.22]]);

/* shared geometries */
const G={
  piston:new THREE.LatheGeometry([[0.001,-0.62],[0.58,-0.62],[0.6,-1.35],[0.672,-1.35],[0.672,-0.55],[0.686,-0.5],[0.686,-0.03],[0.66,0],[0.46,0],[0.4,-0.06],[0.32,-0.2],[0.12,-0.21],[0.001,-0.1]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  ring:(()=>{const g=new THREE.TorusGeometry(0.674,0.02,8,64);g.rotateX(Math.PI/2);return g;})(),
  liner:new THREE.LatheGeometry([[0.692,1.6],[0.8,1.6],[0.8,4.26],[0.885,4.26],[0.885,DECK],[0.692,DECK],[0.692,1.6]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  valve:new THREE.LatheGeometry([[0.001,0],[0.2,0],[0.2,0.03],[0.07,0.13],[0.04,0.22],[0.04,1.66],[0.001,1.66]].map(([r,y])=>new THREE.Vector2(r,y)),24),
  spring:new THREE.TubeGeometry(new Helix(0.11,0.35,6.5),150,0.018,6,false),
  injSpring:new THREE.TubeGeometry(new Helix(0.1,0.22,4.5),110,0.02,6,false),
};
/* injector cam lobe: shorter and a little lower than the valve lobes (40 cam degrees each side of the nose) */
function lobeJ(x,noseDeg,m){const pts=[];for(let b=0;b<360;b+=3){const d=((b-noseDeg)%360+540)%360-180;const rr=0.2+(Math.abs(d)<40?0.12*Math.cos(Math.PI/2*d/40)**2:0);pts.push([rr*Math.cos(b*D2R),rr*Math.sin(b*D2R)]);}return extrudeX(shapeYZ(pts),x-0.09,x+0.09,m);}

B.block=g=>{const m=YEL(),hw=MAT.zinc(),sm=MAT.steel();
  // main casting: deck lip, water-jacket waist, oil-gallery belt, flared crankcase skirt
  g.add(extrudeX(shapeYZ([[-0.55,-1.5],[0.85,-1.52],[1.25,-1.38],[1.7,-1.18],[4.0,-1.18],[4.1,-1.3],[DECK,-1.3],[DECK,1.3],[4.1,1.3],[4.0,1.18],[1.7,1.18],[1.25,1.38],[0.85,1.52],[-0.55,1.5]]),-5.25,5.25,m,0.04));
  for(let i=1;i<=6;i++)for(const s of[-1,1]){const b=cyl(.62,.62,2.15,'y',m,X(i),2.88,s*1.04,40);b.scale.z=0.42;g.add(b);
    g.add(cyl(.15,.15,.05,'z',sm,X(i),3.1,s*1.32));}
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1]){
    g.add(box(.16,2.2,.18,m,x,2.9,s*1.25));
    g.add(box(.18,1.1,.16,m,x,0.6,s*1.48));
    g.add(cyl(.12,.12,.16,'z',m,x,0.15,s*1.56));hex(g,x,0.15,s*1.66,'z',.07,hw);}}
  for(const s of[-1,1])g.add(box(10.3,.1,.12,m,0,1.72,s*1.22));
  g.add(cyl(.12,.12,10.3,'x',m,0,0.95,-1.53));
  for(const s of[-1,1]){g.add(rbox(.9,.7,.3,.06,m,3.9,0.75,s*1.68));for(const dy of[-0.18,0.18])hex(g,3.9,0.75+dy,s*1.85,'z',.07,hw);}
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
  rot.add(cyl(.32,.32,1.1,'x',m,5.85,0,0));                                   // front snout
  rot.add(cyl(.38,.38,.6,'x',m,-5.6,0,0));rot.add(cyl(.6,.6,.2,'x',m,-5.98,0,0));};   // rear: through the gear housing to the flywheel flange
B.liners=g=>{const m=MAT.iron();m.side=THREE.DoubleSide;const o=MAT.rubber();for(let i=1;i<=6;i++){g.add(mesh(G.liner,m,X(i),0,0));g.add(torus(.8,.025,'y',o,X(i),1.75,0));g.add(torus(.8,.025,'y',o,X(i),1.9,0));}};
B.pistons=g=>{const m=MAT.steel();m.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(mesh(G.piston,m,0,0.85,0));g.add(p);A.pist.push(p);}};
B.rings=g=>{const top=MAT.dark(),m=MAT.gasket();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);[[0.73,top],[0.61,m],[0.47,m]].forEach(([y,mm])=>p.add(mesh(G.ring,mm,0,y,0)));g.add(p);A.ring.push(p);}};
B.wristPins=g=>{const m=MAT.chrome();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(cyl(.19,.19,1.0,'x',m,0,0,0));g.add(p);A.pin.push(p);}};
const ROD_SHAPE=(()=>{const s=shapeYZ(circlesHull([[0,0,0.6],[L,0,0.31]],48));for(const[cy,r]of[[0,0.41],[L,0.21]]){const p=new THREE.Path();p.absarc(0,cy,r,0,Math.PI*2,true);s.holes.push(p);}return s;})();
const ROD_RIB=shapeYZ(circlesHull([[0.85,0,0.17],[L-0.55,0,0.09]],24));
B.rods=g=>{const m=MAT.dark(),b=MAT.bronze(),hw=MAT.zinc();b.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const r=new THREE.Group();
  r.add(extrudeX(ROD_SHAPE,-0.15,0.15,m,0.025));
  for(const s of[-1,1])r.add(extrudeX(ROD_RIB,s>0?0.17:-0.21,s>0?0.21:-0.17,m,0.015));
  for(const s of[-1,1]){r.add(box(.36,.02,.2,MAT.black(),0,0,s*0.5));hex(r,0,-0.56,s*0.42,'y',.075,hw);}
  r.add(cyl(.205,.205,.32,'x',b,0,L,0,32,true));
  g.add(r);A.rod.push(r);}};
B.flywheel=g=>{const rot=new THREE.Group();rot.position.x=-6.26;A.fly=rot;g.add(rot);
  rot.add(cyl(2.12,2.12,.36,'x',MAT.dark(),0,0,0,72));rot.add(mesh(gearGeo(120,2.2,.18),MAT.steel(),-0.06,0,0));
  rot.add(cyl(1.55,1.55,.04,'x',MAT.steel(),-0.2,0,0,64));const bm=MAT.steel();for(let k=0;k<8;k++){const a=k/8*Math.PI*2;rot.add(cyl(.07,.07,.1,'x',bm,-0.22,0.45*Math.cos(a),0.45*Math.sin(a),6));}};
B.flywheelHousing=g=>{const m=YEL(),hw=MAT.zinc();m.side=THREE.DoubleSide;
  // front plate over the lower rear gears (crank gear, idler A, compressor drive), with the crank bore
  const plate=shapeYZ(lowerHull);const hole=new THREE.Path();hole.absarc(0,0,0.5,0,Math.PI*2,true);plate.holes.push(hole);
  g.add(extrudeX(plate,-5.71,-5.58,m,0.02));
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.95,2.22,72),m);ring.rotation.y=Math.PI/2;ring.position.x=-5.72;ring.castShadow=true;g.add(ring);
  // SAE bell out to the transmission flange
  g.add(latheX([[2.2,0],[2.3,0.12],[2.46,0.45],[2.56,0.8],[2.6,0.92],[2.82,0.94],[2.84,1.0],[2.82,1.07],[2.5,1.07]],m,-5.72,0,0,96,-1));
  for(let k=0;k<12;k++){const a=(k+0.5)/12*Math.PI*2,b=box(.5,.3,.07,m,-6.4,2.62*Math.cos(a),2.62*Math.sin(a));b.rotation.x=a;g.add(b);}
  g.add(cyl(.5,.5,.6,'z',m,-6.25,0.05,1.95));                                   // starter boss
  g.add(cyl(.12,.12,.25,'z',MAT.dark(),-6.1,-1.2,-2.25,6));hex(g,-6.1,-1.2,-2.4,'z',.08,hw);   // timing bolt hole (plug)
  for(let k=0;k<14;k++){const a=k/14*Math.PI*2;hex(g,-6.84,2.72*Math.cos(a),2.72*Math.sin(a),'x',.07,hw);}};
B.damper=g=>{const rot=new THREE.Group();rot.position.x=6.0;A.damper=rot;g.add(rot);const pm=MAT.steel(),hw=MAT.zinc();
  rot.add(latheX([[0.3,-0.15],[1.06,-0.15],[1.12,-0.1],[1.12,0.1],[1.06,0.15],[0.84,0.15],[0.8,0.09],[0.44,0.09],[0.41,0.16],[0.3,0.16]],MAT.dark(),0,0,0,96));
  rot.add(torus(1.0,.025,'x',MAT.black(),0.15,0,0,72));
  const pv=[[0.3,0.16],[0.72,0.16],[0.8,0.2]];for(let k=0;k<6;k++)pv.push([0.75,0.225+k*0.035],[0.8,0.24+k*0.035]);pv.push([0.8,0.43],[0.7,0.46],[0.3,0.46]);
  rot.add(latheX(pv,pm,0,0,0,72));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;hex(rot,0.5,0.22*Math.cos(a),0.22*Math.sin(a),'x',.06,hw);}};
function gearMesh(T,r,m,y,z){const grp=new THREE.Group();grp.position.set(GX,y,z);grp.add(mesh(gearGeo(T,r,.18),m));grp.add(cyl(r*0.35,r*0.35,.24,'x',MAT.dark(),0,0,0));return grp;}
B.gearTrain=g=>{const m=MAT.steel();A.gC=gearMesh(16,GR.crank,m,0,0);A.gA=gearMesh(30,GR.A,m,...GC.A);A.gB=gearMesh(48,GR.B,m,...GC.B);
  A.gX=gearMesh(23,GR.C,m,...GC.C);A.gAC=gearMesh(16,GR.ac,m,...GC.ac);g.add(A.gC,A.gA,A.gB,A.gX,A.gAC);
  const tm=MAT.black();g.add(box(.02,.12,.03,tm,GX-0.1,GR.crank-0.02,0));g.add(box(.02,.12,.03,tm,GX-0.1,GC.A[0]-GR.A+0.04,GC.A[1]-0.02));};   // timing marks
B.camGear=g=>{A.gCam=gearMesh(32,GR.cam,MAT.steel(),...GC.cam);g.add(A.gCam);g.add(box(.02,.14,.03,MAT.black(),GX-0.1,GC.cam[0]-GR.cam+0.05,GC.cam[1]));};
B.gearHousing=g=>{const m=YEL(),hw=MAT.zinc();g.add(extrudeX(shapeYZ(housingHull),-5.31,-5.25,m));
  housingHull.filter((_,i)=>i%9===0).forEach(([y,z])=>{const k=0.9;hex(g,-5.34,y*k+GC.B[0]*(1-k),z*k+GC.B[1]*(1-k),'x',.05,hw);});
  g.add(box(.14,.16,.24,m,-5.38,6.85,1.42));};                                  // sensor boss above the cam gear
B.frontCover=g=>{const m=YEL();g.add(extrudeX(shapeYZ(circlesHull([[0,0,0.95],[2.1,-1.0,0.55],[1.2,0.9,0.5]])),5.25,5.45,m,0.03));g.add(torus(.36,.05,'x',MAT.rubber(),5.47,0,0));
  const bm=MAT.steel();for(let k=0;k<10;k++){const a=k/10*Math.PI*2;g.add(cyl(.05,.05,.06,'x',bm,5.48,0.78*Math.cos(a),0.78*Math.sin(a),6));}};
function panProf(d,wb){const r=0.28,p=[[-0.6,1.45],[-0.64,1.42]];for(let k=0;k<=6;k++){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),wb-r+r*Math.cos(a)]);}
  for(let k=6;k>=0;k--){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),-(wb-r+r*Math.cos(a))]);}p.push([-0.64,-1.42],[-0.6,-1.45]);return shapeYZ(p);}
B.oilPan=g=>{const m=MAT.black();m.side=THREE.DoubleSide;
  g.add(extrudeX(panProf(1.62,1.12),-5.15,1.75,m,0.07));
  g.add(extrudeX(panProf(2.9,1.0),1.45,5.15,m,0.07));
  for(let k=0;k<5;k++)for(const s of[-1,1])g.add(box(.06,1.0,.07,m,1.9+k*0.75,-2.1,s*1.06));
  g.add(rbox(10.5,0.1,3.1,0.03,m,0,-0.6,0));const hw=MAT.zinc();hex(g,3.0,-2.95,0.4,'y',.1,hw);
  for(let k=0;k<13;k++)for(const s of[-1,1])hex(g,-5.0+k*0.83,-0.69,s*1.5,'y',.06,hw);};
B.headGasket=g=>{g.add(box(10.45,0.04,2.55,MAT.gasket(),0,DECK+0.02,0));};
B.head=g=>{const m=YEL(),hw=MAT.zinc();
  g.add(extrudeX(shapeYZ([[4.4,-1.32],[4.52,-1.36],[4.62,-1.28],[5.45,-1.26],[5.58,-1.32],[5.65,-1.3],[5.65,1.3],[5.58,1.32],[5.45,1.26],[4.62,1.28],[4.52,1.36],[4.4,1.32]]),-5.25,5.25,m,0.03));
  for(let i=1;i<=6;i++){g.add(rbox(.82,.5,.12,.05,m,X(i),4.95,1.31));g.add(rbox(.82,.48,.1,.04,m,X(i),5.2,-1.3));}
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1])g.add(cyl(.13,.13,1.1,'y',m,x,5.05,s*1.3,24));}
  for(const[x,z]of[[4.55,-1.42],[-4.55,1.42]]){g.add(box(.42,.5,.09,m,x,5.85,z));g.add(torus(.14,.045,'z',m,x,6.2,z));hex(g,x-0.12,5.75,z+(z>0?0.06:-0.06),'z',.05,hw);hex(g,x+0.12,5.75,z+(z>0?0.06:-0.06),'z',.05,hw);}
  const sl=MAT.bronze();sl.side=THREE.DoubleSide;for(let i=1;i<=6;i++)g.add(cyl(.15,.15,.9,'y',sl,X(i),4.95,0,24,true));   // injector sleeves
};
const VY=6.3,VH=1.25,VW=1.25;
const VC_PROF=(()=>{const p=[];for(let k=0;k<=32;k++){const t=k/32*Math.PI,c=Math.cos(t),s=Math.sin(t);p.push([VY+VH*Math.pow(s,0.55),VW*Math.sign(c)*Math.pow(Math.abs(c),0.4)]);}return p;})();
const vcTop=z=>{const c=Math.pow(Math.min(1,Math.abs(z)/VW),2.5);return VY+VH*Math.pow(Math.sqrt(1-c*c),0.55)+0.1;};
B.valveCover=g=>{const m=YEL(),bk=MAT.black();
  g.add(rbox(10.3,.62,2.58,.05,m,0,5.97,0));g.add(rbox(10.34,.06,2.62,.02,bk,0,5.69,0));g.add(rbox(10.4,.06,2.66,.02,bk,0,6.29,0));   // base (spacer) + gaskets
  g.add(cyl(.12,.12,.2,'z',MAT.plastic(),-1.0,5.95,-1.38,16));g.add(box(.3,.2,.12,MAT.plastic(),-1.0,5.95,-1.5));            // injector harness pass-through
  g.add(extrudeX(shapeYZ(VC_PROF),-5.05,5.05,m,0.1));
  g.add(cyl(.2,.2,.12,'y',bk,2.9,vcTop(-0.6)+0.04,-0.6,32));g.add(box(.3,.06,.06,bk,2.9,vcTop(-0.6)+0.12,-0.6));       // oil fill cap
  g.add(cyl(.12,.12,.25,'x',bk,-5.2,7.0,-0.6,24));                                                                        // breather
  const c=document.createElement('canvas');c.width=1024;c.height=256;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const draw=()=>{const x=c.getContext('2d');x.clearRect(0,0,1024,256);x.fillStyle='#111';x.textBaseline='middle';
    x.font='700 120px "Barlow Condensed","Arial Narrow",sans-serif';x.textAlign='right';x.fillText('CAT',330,140);
    x.fillRect(360,40,8,190);
    x.font='700 210px "Barlow Condensed","Arial Narrow",sans-serif';x.textAlign='left';x.fillText('C15',400,140);t.needsUpdate=true;};
  draw();document.fonts&&document.fonts.load('700 100px "Barlow Condensed"').then(draw).catch(()=>{});
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(3.6,0.9),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.5,metalness:.1}));pl.rotation.x=-Math.PI/2;pl.position.set(-0.6,vcTop(0)+0.006,0);g.add(pl);
  const hw=MAT.zinc(),iso=MAT.rubber(),by=vcTop(0.8);for(let k=0;k<7;k++)for(const s of[-1,1]){const x=(3-k)*S+(k===6?0.3:0);g.add(cyl(.11,.11,.03,'y',iso,x,by,s*0.8));hex(g,x,by+0.05,s*0.8,'y',.075,hw);}};
B.valves=g=>{const mi=MAT.steel(),me=MAT.hot();for(let i=1;i<=6;i++){for(const[arr,dx,m]of[[A.vI,0.33,mi],[A.vE,-0.33,me]]){const v=new THREE.Group();for(const z of[-0.3,0.3])v.add(mesh(G.valve,m,X(i)+dx,4.42,z));g.add(v);arr.push(v);}}};
B.springs=g=>{const m=MAT.dark(),rm=MAT.steel();for(let i=1;i<=6;i++){for(const[sa,ta,dx]of[[A.sI,A.tI,0.33],[A.sE,A.tE,-0.33]]){const sp=[];const tg=new THREE.Group();
  for(const z of[-0.3,0.3]){const s=mesh(G.spring,m,X(i)+dx,5.65,z);g.add(s);sp.push(s);tg.add(cyl(.13,.13,.04,'y',rm,X(i)+dx,6.0,z,20));}
  g.add(tg);sa.push(sp);ta.push(tg);}}};
B.crossheads=g=>{const m=MAT.steel();for(let i=1;i<=6;i++)for(const[arr,dx]of[[A.chI,0.33],[A.chE,-0.33]]){const c=new THREE.Group();c.add(box(.12,.08,.74,m,X(i)+dx,6.12,0));c.add(cyl(.06,.06,.04,'y',m,X(i)+dx,6.17,0,12));g.add(c);arr.push(c);}};
B.camshaft=g=>{const rot=new THREE.Group();rot.position.set(0,5.95,0.9);A.cam=rot;g.add(rot);const m=MAT.steel();
  rot.add(cyl(.12,.12,10.7,'x',m,-0.1,0,0));for(let k=0;k<7;k++)rot.add(cyl(.22,.22,.22,'x',m,(3-k)*S,0,0));
  for(let i=1;i<=6;i++){rot.add(lobe(X(i)+0.33,(IN_PEAK+PH[i-1])/2,m));rot.add(lobeJ(X(i),(INJ_PEAK+PH[i-1])/2,m));rot.add(lobe(X(i)-0.33,(EX_PEAK+PH[i-1])/2,m));}
  const cm=YEL();for(let k=0;k<7;k++){const x=(3-k)*S;g.add(box(.26,.22,.62,cm,x,6.13,0.9));g.add(box(.26,.12,.62,cm,x,5.71,0.9));}};
const LEVER=(w)=>shapeYZ(circlesHull([[0,0,0.15+w],[-0.27,0.45,0.1+w*0.5],[-0.24,-0.45,0.075+w*0.5]],32));
function rockerArm(x,m,sm,w){const r=new THREE.Group();r.position.set(x,6.5,0.45);
  r.add(cyl(.15+w,.15+w,.17,'x',m,0,0,0));r.add(extrudeX(LEVER(w),-0.055-w,0.055+w,m,0.012));
  r.add(cyl(.08,.08,.11,'x',sm,0,-0.27,0.45,20));r.add(cyl(.035,.035,.2,'y',sm,0,-0.22,-0.45,8));r.add(cyl(.06,.06,.05,'y',sm,0,-0.16,-0.45,6));return r;}
B.rockers=g=>{const m=MAT.dark(),sm=MAT.steel(),ym=YEL();g.add(cyl(.09,.09,10.5,'x',sm,0,6.5,0.45));
  for(let k=0;k<7;k++)g.add(box(.22,.85,.26,ym,(3-k)*S,6.07,0.45));
  for(let i=1;i<=6;i++)for(const[arr,dx]of[[A.rkI,0.33],[A.rkE,-0.33]]){const r=rockerArm(X(i)+dx,m,sm,0);g.add(r);arr.push(r);}};
B.injRockers=g=>{const m=MAT.iron(),sm=MAT.steel();for(let i=1;i<=6;i++){const r=rockerArm(X(i),m,sm,0.02);g.add(r);A.rkJ.push(r);}};
B.brake=g=>{const m=MAT.black(),d=MAT.dark();
  for(const xc of[3.4,0,-3.4]){g.add(rbox(3.0,.38,1.1,.05,m,xc,6.95,0.38));
    g.add(cyl(.11,.11,.22,'y',d,xc+0.5,7.25,0.55,16));g.add(box(.18,.1,.16,MAT.plastic(),xc+0.5,7.4,0.55));}   // control solenoid
  for(let k=0;k<7;k++)g.add(cyl(.05,.05,.26,'y',MAT.steel(),(3-k)*S,6.63,0.45,8));                               // studs to the rocker pedestals
  for(let i=1;i<=6;i++){g.add(cyl(.09,.09,.2,'y',MAT.steel(),X(i)-0.33,6.66,0,16));g.add(cyl(.09,.09,.2,'y',MAT.bronze(),X(i),6.66,0,16));}};   // slave / master pistons
B.injectors=g=>{const b=MAT.steel(),n=MAT.dark(),c=MAT.black();for(let i=1;i<=6;i++){const x=X(i);
  g.add(cyl(.04,.05,.3,'y',n,x,4.5,0,12));g.add(cyl(.1,.1,1.0,'y',b,x,5.15,0,20));g.add(cyl(.14,.14,.3,'y',b,x,5.75,0,20));
  g.add(box(.2,.18,.24,c,x,5.76,-0.25));g.add(box(.08,.06,.1,MAT.bronze(),x,5.88,-0.32));                       // solenoid + terminals
  const sp=mesh(G.injSpring,n,x,5.9,0);g.add(sp);A.injS.push(sp);
  const tp=new THREE.Group();tp.add(cyl(.045,.045,.28,'y',b,x,6.02,0,12));tp.add(cyl(.12,.12,.04,'y',b,x,6.15,0,20));g.add(tp);A.injT.push(tp);   // plunger tappet
  const fx=new THREE.Group();fx.position.set(x,4.33,0);fx.visible=false;const sm=new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});FXMAT.add(sm);
  for(let k=0;k<6;k++){const cg=new THREE.ConeGeometry(0.06,0.5,10,1,true);cg.translate(0,-0.25,0);const cm=new THREE.Mesh(cg,sm);cm.rotation.order='YXZ';cm.rotation.set(0,k*60*D2R,68*D2R);cm.userData.fx=true;fx.add(cm);}
  g.add(fx);A.spray.push(fx);
  const fm=new THREE.SpriteMaterial({map:GLOW,color:0xff7a2a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});FXMAT.add(fm);const fl=new THREE.Sprite(fm);fl.position.set(x,4.25,0);fl.scale.setScalar(1.3);fl.visible=false;fl.userData.fx=true;g.add(fl);A.flame.push(fl);}};
B.fuelGallery=g=>{const m=MAT.steel(),br=MAT.bronze(),r=MAT.rubber();
  g.add(cyl(.07,.07,9.2,'x',new THREE.MeshStandardMaterial({color:0xc9a43a,roughness:.4,metalness:.6}),0,4.8,-0.95,16));   // drilled gallery in the head
  for(let i=1;i<=6;i++)g.add(cyl(.035,.035,.8,'z',m,X(i),4.8,-0.55,8));
  for(const x of[4.25,-4.25]){g.add(cyl(.07,.07,.4,'z',m,x,4.78,-1.15,10));hex(g,x,4.75,-1.4,'z',.09,br);}
  g.add(cyl(.09,.09,.22,'z',MAT.alu(),-4.25,4.75,-1.58,16));                                                    // pressure-regulating valve
  g.add(tube([[-0.72,0.8,-2.05],[0.0,2.0,-2.1],[2.5,3.9,-1.9],[4.0,4.45,-1.62],[4.25,4.75,-1.5]],.045,m,48));   // supply to the head
  g.add(tube([[-4.25,4.75,-1.7],[-4.5,4.5,-1.9],[-4.55,3.9,-2.15],[-4.4,3.0,-2.2]],.05,r,32));                   // return to tank
  for(const p of[[1.2,2.9,-2.02],[3.3,4.2,-1.78]])g.add(box(.1,.14,.16,MAT.dark(),...p));};
B.transferPump=g=>{const a=MAT.alu(),d=MAT.dark(),hw=MAT.zinc();
  g.add(rbox(.7,.45,.45,.06,a,-3.25,0.25,-2.0));g.add(cyl(.2,.2,.12,'x',d,-2.86,0.25,-2.0,24));g.add(box(.5,.3,.28,d,-3.25,0.25,-1.67));   // body, end cover, mounting boss
  for(const dx of[-0.25,0.25])for(const dy of[-0.15,0.15])hex(g,-3.25+dx,0.25+dy,-2.24,'z',.05,hw);
  g.add(tube([[-2.95,0.32,-2.15],[-2.3,0.55,-2.25],[-1.28,0.75,-2.05]],.045,MAT.rubber(),32));                 // to the filter base
  g.add(tube([[-3.55,0.3,-2.15],[-3.85,0.0,-2.35],[-3.8,-0.35,-2.55]],.06,MAT.rubber(),24));};                 // from the tank
B.fuelFilter=g=>{g.add(rbox(.55,.25,.55,.04,MAT.alu(),-1.0,0.75,-2.0));canister(g,-1.0,0.63,-2.05,.27,.9,MAT.filter());
  g.add(box(.2,.3,.5,MAT.dark(),-1.0,0.75,-1.6));
  g.add(cyl(.09,.09,.3,'y',MAT.alu(),-1.15,1.02,-2.12,16));g.add(cyl(.14,.14,.08,'y',MAT.black(),-1.15,1.2,-2.12,20));};   // hand priming pump
B.ecm=g=>{const b=MAT.black(),a=MAT.alu();g.add(rbox(2.3,1.3,.1,.02,b,-3.05,2.9,-1.47));g.add(box(2.4,1.4,.05,a,-3.05,2.9,-1.39));
  for(let k=0;k<9;k++)g.add(box(.04,1.1,.06,b,-4.0+k*0.24,2.9,-1.55));g.add(box(.5,.18,.16,MAT.plastic(),-3.6,3.6,-1.47));g.add(box(.5,.18,.16,MAT.plastic(),-2.6,3.6,-1.47));
  for(const[x,y]of[[-4.1,2.3],[-4.1,3.5],[-2.0,2.3],[-2.0,3.5]])g.add(cyl(.07,.07,.1,'z',MAT.rubber(),x,y,-1.34,12));};   // isolators
B.intakeManifold=g=>{const m=MAT.alu(),hw=MAT.zinc();g.add(rbox(9.6,.62,.5,.12,m,-0.1,5.2,-1.56));for(let i=1;i<=6;i++)g.add(rbox(.8,.5,.14,.04,m,X(i),5.2,-1.33));
  for(let k=0;k<12;k++)hex(g,-4.55+k*0.82,5.53,-1.72,'y',.05,hw);};
B.intakeConnection=g=>{const m=MAT.alu();g.add(cyl(.3,.3,.6,'x',m,5.0,5.25,-1.6));g.add(rbox(.55,.55,.6,.08,m,5.0,5.55,-1.6));g.add(torus(.31,.03,'x',MAT.dark(),5.28,5.25,-1.6));};
B.imap=g=>{g.add(cyl(.08,.08,.22,'y',MAT.black(),0.3,5.62,-1.56,16));g.add(box(.14,.1,.18,MAT.plastic(),0.3,5.75,-1.56));
  g.add(cyl(.06,.06,.2,'y',MAT.bronze(),-1.4,5.6,-1.56,12));g.add(box(.12,.1,.16,MAT.plastic(),-1.4,5.74,-1.56));};
B.chargePipes=g=>{const a=MAT.alu(),r=MAT.rubber();
  g.add(tube([[0.7,6.33,3.3],[1.3,6.75,2.85],[3.0,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]],.24,a,64));
  g.add(tube([[1.35,5.45,2.95],[2.6,5.5,3.3],[4.5,5.4,3.4],[7.6,5.3,3.4]],.33,r,64));
  g.add(tube([[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.3,5.25,-1.6]],.27,a,48));
  for(const[x,y,z]of[[7.6,6.3,2.55],[7.6,5.3,3.4],[7.6,5.7,-2.5]])g.add(torus(z>0&&y<6?.35:.28,.04,'x',MAT.dark(),x,y,z));};
B.exhaustManifold=g=>{const m=MAT.hot();
  g.add(cyl(.23,.27,2.5,'x',m,3.3,4.95,1.85));g.add(cyl(.29,.29,3.9,'x',m,0,4.95,1.85));g.add(cyl(.27,.23,2.5,'x',m,-3.3,4.95,1.85));
  for(const s of[-1,1]){g.add(cyl(.33,.33,.2,'x',MAT.iron(),s*2.0,4.95,1.85));g.add(cyl(.2,.2,.1,'x',m,s*4.6,4.95,1.85));}
  const hw=MAT.zinc();
  for(let i=1;i<=6;i++){const sw=X(i)>0?-0.28:0.28;g.add(tube([[X(i),4.95,1.34],[X(i),4.97,1.52],[X(i)+sw*0.5,4.96,1.7],[X(i)+sw,4.95,1.84]],.19,m,16));
    g.add(rbox(.72,.55,.07,.05,m,X(i),4.95,1.33));
    for(const dx of[-0.27,0.27])for(const dy of[-0.19,0.19])hex(g,X(i)+dx,4.95+dy,1.39,'z',.05,hw);}
  g.add(cyl(.25,.25,.5,'z',m,-0.4,4.97,2.15));};
B.turbine=g=>{const m=MAT.hot();m.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.36,.5,.07,.27,Math.PI-0.92*Math.PI*2),m,-0.4,5.45,2.95));
  g.add(cyl(.27,.27,.65,'z',m,-0.4,4.95,2.62));g.add(cyl(.34,.34,.08,'z',m,-0.4,4.95,2.3,6));
  g.add(cyl(.4,.4,.42,'x',m,-0.4,5.45,2.95));g.add(cyl(.46,.46,.06,'x',m,-0.15,5.45,2.95));g.add(cyl(.33,.3,.45,'x',m,-0.8,5.45,2.95,32,true));
  const w=new THREE.Group();w.position.set(-0.75,5.45,2.95);A.turb=w;g.add(w);const wm=MAT.dark();w.add(cyl(.08,.12,.2,'x',wm,0,0,0,16));
  for(let k=0;k<11;k++){const a=k/11*Math.PI*2;const b=box(.18,.16,.02,wm,0,0.16*Math.cos(a),0.16*Math.sin(a));b.rotation.order='XYZ';b.rotation.set(a,0.45,0);w.add(b);}};
B.chra=g=>{const m=MAT.iron(),t=MAT.steel();g.add(cyl(.28,.28,.55,'x',m,0.1,5.45,2.95));
  g.add(tube([[0.1,5.73,2.95],[0.4,6.1,2.6],[1.25,5.9,1.6],[1.3,5.4,1.36],[1.3,4.0,1.3]],.045,t,48));
  g.add(tube([[0.1,5.17,2.95],[0.15,4.4,2.7],[0.3,3.6,1.9],[0.3,3.3,1.3]],.07,MAT.rubber(),40));};
B.compressor=g=>{const m=MAT.alu();m.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.38,.52,.07,.28,0.16*Math.PI),m,0.7,5.45,2.95));
  g.add(cyl(.5,.5,.2,'x',m,0.5,5.45,2.95));g.add(cyl(.34,.34,.55,'x',m,1.1,5.45,2.95,32,true));g.add(torus(.35,.04,'x',m,1.37,5.45,2.95));
  g.add(tube([[0.7,5.97,2.95],[0.7,5.98,3.15],[0.7,6.12,3.3],[0.7,6.35,3.3]],.25,m,24));
  const w=new THREE.Group();w.position.set(0.95,5.45,2.95);A.comp=w;g.add(w);const wm=MAT.chrome();w.add(cyl(.05,.2,.3,'x',wm,0,0,0,20));
  for(let k=0;k<10;k++){const a=k/10*Math.PI*2;const b=box(.3,.17,.02,wm,0,0.16*Math.cos(a),0.16*Math.sin(a));b.rotation.set(a,-0.5,0);w.add(b);}};
B.wastegate=g=>{const d=MAT.black(),st=MAT.steel();
  g.add(cyl(.2,.2,.3,'x',d,0.5,4.6,3.62,32));g.add(torus(.2,.025,'x',MAT.dark(),0.5,4.6,3.62,32));        // diaphragm canister
  g.add(box(.5,.1,.14,MAT.dark(),0.55,4.85,3.4));                                                            // bracket to the compressor housing
  g.add(cyl(.025,.025,.75,'x',st,-0.02,4.6,3.6,8));                                                          // actuator rod
  const lv=box(.06,.3,.06,st,-0.4,4.72,3.52);lv.rotation.x=0.5;g.add(lv);g.add(cyl(.06,.06,.12,'z',MAT.hot(),-0.4,4.84,3.42,12));   // lever on the valve shaft
  g.add(tube([[0.55,5.97,3.2],[0.75,5.6,3.65],[0.7,4.85,3.75],[0.6,4.6,3.82]],.03,MAT.rubber(),24));};     // boost signal hose
B.exhaustOutlet=g=>{const m=MAT.steel();g.add(tube([[-0.95,5.45,2.95],[-1.6,5.45,2.98],[-2.05,5.0,3.0],[-2.2,4.0,3.0],[-2.2,2.6,3.0]],.3,m,48));g.add(torus(.36,.05,'x',MAT.dark(),-1.02,5.45,2.95));};
B.waterPump=g=>{const a=MAT.alu(),y=2.1,z=-1.0;a.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.24,.31,.05,.15,0.3),a,5.68,y,z));g.add(cyl(.3,.3,.22,'x',a,5.58,y,z));g.add(cyl(.14,.16,.2,'x',a,5.85,y,z));
  g.add(tube([[5.72,1.8,-1.3],[5.75,1.4,-1.6],[5.95,1.0,-1.8]],.12,MAT.rubber(),16));
  const w=new THREE.Group();w.position.set(5.97,y,z);A.wp=w;g.add(w);
  w.add(cyl(.13,.13,.04,'x',MAT.steel(),0,0,0,24));for(let k=0;k<4;k++){const t=k/4*Math.PI*2;w.add(cyl(.03,.03,.04,'x',MAT.dark(),0.02,0.08*Math.cos(t),0.08*Math.sin(t),8));}};
B.thermostat=g=>{const m=YEL();g.add(cyl(.3,.3,.5,'y',m,5.45,5.25,-0.85));g.add(cyl(.2,.2,.9,'x',m,5.9,5.3,-0.85));g.add(torus(.22,.03,'x',MAT.dark(),6.25,5.3,-0.85));};
B.coolantSensor=g=>{g.add(cyl(.06,.06,.25,'y',MAT.black(),5.45,5.6,-0.6,12));};
B.oilPump=g=>{const m=MAT.iron();g.add(box(.8,.45,.9,m,4.0,-1.45,0.1));g.add(tube([[4.0,-1.65,0.3],[4.0,-2.2,0.4],[3.6,-2.62,0.3]],.08,MAT.steel(),24));g.add(cyl(.32,.32,.06,'y',MAT.dark(),3.6,-2.72,0.3,24));};
B.oilCooler=g=>{const m=YEL(),hw=MAT.zinc();g.add(rbox(3.2,.6,.22,.05,m,1.8,1.25,-1.62));for(let k=0;k<9;k++)g.add(box(.04,.44,.04,m,0.6+k*0.3,1.25,-1.75));
  for(const x of[0.3,3.3])for(const y of[1.05,1.45])hex(g,x,y,-1.76,'z',.05,hw);};
B.oilFilter=g=>{g.add(rbox(.55,.25,.55,.04,MAT.alu(),1.4,0.78,-1.98));canister(g,1.4,0.66,-2.05,.3,1.0,MAT.filter());};
B.oilSensor=g=>{g.add(cyl(.07,.07,.22,'z',MAT.black(),1.95,0.78,-1.85,12));};
B.fuelSensor=g=>{g.add(cyl(.06,.06,.2,'y',MAT.black(),-0.82,0.98,-2.18,12));g.add(box(.14,.1,.16,MAT.plastic(),-0.82,1.13,-2.18));};
const FAN_BLADE=(()=>{const U=12,V=8,pos=[],idx=[];
  for(let i=0;i<=U;i++){const u=i/U,r=0.55+u*1.45,w=0.32+0.24*u,tw=0.9-0.5*u,sw=0.28*u*u;
    for(let j=0;j<=V;j++){const v=j/V-0.5,cam=0.05*(1-4*v*v),cz=v*w+sw;pos.push(cam*Math.cos(tw)+cz*Math.sin(tw),r,-cam*Math.sin(tw)+cz*Math.cos(tw));}}
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;})();
B.fan=g=>{const d=MAT.dark();g.add(cyl(.42,.42,.55,'x',d,6.3,3.6,0));g.add(box(.8,.6,.6,YEL(),5.65,3.6,0));
  const f=new THREE.Group();f.position.set(6.75,3.6,0);A.fan=f;g.add(f);const bm=MAT.plastic();bm.side=THREE.DoubleSide;
  f.add(latheX([[0.001,-0.12],[0.56,-0.12],[0.6,-0.06],[0.6,0.08],[0.4,0.14],[0.001,0.16]],bm,0,0,0,48));
  for(let k=0;k<10;k++){const b=mesh(FAN_BLADE,bm);b.rotation.x=k/10*Math.PI*2;f.add(b);}
  const fp=new THREE.Group();fp.position.set(6.25,3.6,0);A.fanP=fp;g.add(fp);fp.add(cyl(.48,.48,.16,'x',MAT.steel(),0,0,0,36));};
B.alternator=g=>{const a=MAT.alu(),d=MAT.black(),hw=MAT.zinc(),y=1.0,z=1.95;
  g.add(latheX([[0.15,0],[0.38,0],[0.42,0.05],[0.42,0.55],[0.44,0.57],[0.44,1.05],[0.4,1.12],[0.15,1.12]],a,4.66,y,z,48));
  for(const[x0,n]of[[4.9,12],[5.5,12]])for(let k=0;k<n;k++){const t=(k+0.5)/n*Math.PI*2,b=box(.26,.05,.05,d,x0,y+0.43*Math.cos(t),z+0.43*Math.sin(t));b.rotation.x=t;g.add(b);}
  for(let k=0;k<4;k++){const t=k/4*Math.PI*2+0.4;g.add(cyl(.025,.025,1.15,'x',MAT.steel(),5.22,y+0.45*Math.cos(t),z+0.45*Math.sin(t),8));}
  g.add(box(.22,.25,.16,a,4.85,y+0.5,z));g.add(box(.22,.25,.16,a,5.6,y-0.5,z));hex(g,4.85,y+0.58,z,'z',.06,hw);
  g.add(box(.22,.3,.42,MAT.dark(),4.85,y+0.5,1.7));                                                          // mounting bracket to the block
  g.add(cyl(.05,.05,.16,'x',MAT.bronze(),4.58,y+0.18,z,8));hex(g,4.6,y+0.18,z,'x',.06,hw);
  const p=new THREE.Group();p.position.set(6.25,y,z);A.alt=p;g.add(p);const st=MAT.steel();
  const pv=[[0.05,-0.09],[0.2,-0.09],[0.27,-0.07]];for(let k=0;k<4;k++)pv.push([0.23,-0.05+k*0.035],[0.27,-0.035+k*0.035]);pv.push([0.27,0.09],[0.05,0.09]);p.add(latheX(pv,st,0,0,0,40));
  p.add(cyl(.05,.05,.55,'x',st,-0.32,0,0,12));hex(p,0.12,0,0,'x',.07,hw);
  for(let k=0;k<11;k++){const b=box(.06,.2,.02,a,-0.38,0.29*Math.cos(k/11*Math.PI*2),0.29*Math.sin(k/11*Math.PI*2));b.rotation.set(k/11*Math.PI*2,0.5,0);p.add(b);}};
B.belt=g=>{const cs=[[0,0,.81],[3.6,0,.51],[1.0,1.95,.29],[1.05,-1.2,.28]];const hl=circlesHull(cs,64);
  const dense=[];for(let i=0;i<hl.length;i++){const a=hl[i],b=hl[(i+1)%hl.length];const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.08));for(let k=0;k<n;k++)dense.push([0,a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  const bm=tube(dense,.045,MAT.rubber(),dense.length*2,true);bm.scale.x=2.4;bm.position.x=6.25;g.add(bm);
  const t=new THREE.Group();t.position.set(6.25,1.05,-1.2);A.tens=t;g.add(t);t.add(cyl(.25,.25,.18,'x',MAT.steel(),0,0,0,24));
  beamYZ(g,[1.05,-1.2],[1.4,-0.6],.12,.14,MAT.dark()).position.x=6.0;g.add(cyl(.18,.18,.25,'x',MAT.dark(),5.95,1.4,-0.6));
  g.add(box(.5,.2,.2,MAT.dark(),5.7,1.4,-0.6));};                                                            // tensioner mount on the front housing
B.airCompressor=g=>{const a=MAT.alu(),d=MAT.dark(),hw=MAT.zinc(),y=0.95,z=-2.1;
  g.add(latheX([[0.2,0],[0.52,0],[0.52,0.1],[0.42,0.12],[0.42,1.3],[0.2,1.32]],d,-5.24,y,z,48));          // mounting flange on the rear housing + crankcase
  for(let k=0;k<6;k++){const t=k/6*Math.PI*2;hex(g,-5.08,y+0.46*Math.cos(t),z+0.46*Math.sin(t),'x',.05,hw);}
  g.add(cyl(.28,.3,.55,'y',d,-4.4,y+0.5,z,32));for(let k=0;k<7;k++)g.add(cyl(.38,.38,.022,'y',d,-4.4,y+0.27+k*0.07,z,32));   // finned barrel
  g.add(rbox(.64,.24,.64,.06,a,-4.4,y+0.89,z));for(const dx of[-0.22,0.22])for(const dz of[-0.22,0.22])hex(g,-4.4+dx,y+1.04,z+dz,'y',.05,hw);   // head
  g.add(cyl(.08,.08,.2,'z',a,-4.4,y+0.89,z-0.4,16));
  g.add(tube([[-4.4,y+0.89,z-0.45],[-4.4,1.6,-2.85],[-4.0,0.6,-2.95],[-3.8,-0.3,-2.9]],.06,MAT.steel(),40));};   // discharge line
B.starter=g=>{const d=MAT.black(),k=MAT.dark(),hw=MAT.zinc(),y=0.05,z=2.05,o=-0.8;
  g.add(cyl(.36,.36,1.15,'x',d,-4.22+o,y,z,40));
  const dome=new THREE.SphereGeometry(.36,32,12,0,Math.PI*2,0,Math.PI/2);dome.rotateZ(-Math.PI/2);g.add(mesh(dome,d,-3.645+o,y,z));
  g.add(cyl(.3,.37,.4,'x',k,-5.0+o,y,z,40));g.add(rbox(.08,.95,.95,.12,k,-5.22+o,y,z));for(const t of[0.5,2.6,4.7])hex(g,-5.28+o,y+0.4*Math.cos(t),z+0.4*Math.sin(t),'x',.06,hw);
  g.add(cyl(.25,.25,.3,'x',k,-5.4+o,y,z));
  g.add(cyl(.19,.19,.8,'x',d,-4.55+o,y+0.55,z,32));g.add(cyl(.2,.2,.06,'x',k,-4.12+o,y+0.55,z,32));
  for(const dz of[-0.08,0.08]){g.add(cyl(.035,.035,.14,'x',MAT.bronze(),-4.03+o,y+0.6,z+dz,8));hex(g,-4.0+o,y+0.6,z+dz,'x',.045,hw);}
  for(let j=0;j<2;j++){const t=j*Math.PI+0.8;g.add(cyl(.02,.02,1.2,'x',MAT.steel(),-4.22+o,y+0.37*Math.cos(t),z+0.37*Math.sin(t),6));}};
B.crankSensor=g=>{g.add(cyl(.07,.07,.35,'y',MAT.black(),-6.35,2.7,0.6,12));hex(g,-6.35,2.6,0.6,'y',.09,MAT.zinc());g.add(box(.12,.1,.16,MAT.plastic(),-6.35,2.92,0.6));};
B.camSensor=g=>{g.add(cyl(.07,.07,.3,'y',MAT.black(),-5.43,7.05,1.5,12));g.add(box(.14,.12,.16,MAT.plastic(),-5.43,7.26,1.5));};
return B;
}
