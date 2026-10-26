// Detroit DD15 (EPA07 / EPA10 / GHG14 era): 14.8 L inline-six, 139 × 163 mm, ACRS amplified common rail,
// dual overhead camshafts driven by a rear gear train, asymmetric turbo + turbo compound, high-pressure cooled
// EGR, staged Detroit engine brake. The engine definition for the Engine Lab (src/engineLab/core.js): what it
// is, its parts and systems, the build sequence, how each part is drawn (builders) and what turns (spin).
// 1 scene unit = 100 mm; cylinder 1 at the front (+X); +z is the exhaust (right) side, -z the intake/fuel side.

export const meta={
  id:'dd15', mark:'DD15', name:'Detroit DD15', maker:'Detroit',
  sub:'14.8 L inline-six · 139 × 163 mm · ACRS amplified common rail · DOHC · turbo compound · cooled EGR',
  overview:'Heavy-duty 15-litre inline-six',
  specs:[['Displacement','14.8 L (904 cu in)'],['Layout','Inline 6, 4 valves/cyl'],['Bore × stroke','139 × 163 mm'],['Firing order','1-5-3-6-2-4'],['Valvetrain','Dual overhead cams, rear gear train'],['Fuel','ACRS amplified common rail'],['Air','Asymmetric turbo + charge air cooler'],['Energy recovery','Turbo compound (EPA07–GHG14)'],['Emissions','High-pressure cooled EGR + aftertreatment'],['Retarder','Detroit engine brake, staged'],['Ratings','Roughly 400–505 hp, up to about 1,850 lb-ft (by year)']],
  manual:'the Detroit service literature (DDCSN / DiagnosticLink) for your engine serial number',
  hud:{boost:'Boost ≈',rail:'Rail → injection ≈',railVal:k=>(450+k*450).toFixed(0)+' → '+(1100+k*1100).toFixed(0)+' bar'},
};
export const geo={S:1.7, R:0.815, L:2.6, DECK:4.36, PH:[0,480,240,600,120,360], FIRING:[1,5,3,6,2,4], IN_PEAK:465, EX_PEAK:255, stroke:0.163};

export const SYS={
  struct:{name:'Block & housings',c:'#b9bec4'},
  rot:{name:'Rotating assembly',c:'#ff8a3d'},
  valve:{name:'Valvetrain (DOHC)',c:'#c7e06a'},
  fuel:{name:'Fuel system (ACRS)',c:'#ffd23f'},
  air:{name:'Air & turbo',c:'#5aa9ff'},
  exh:{name:'Exhaust & turbo compound',c:'#ff5d4d'},
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
  fn:"The backbone of the engine. It carries the six cylinders, supports the crankshaft in seven main bearings, and contains the coolant jackets and oil galleries every other system depends on.",
  mech:"A single iron casting. Pressurised oil runs through drilled galleries to the main bearings, the piston cooling jets and up to the head; coolant runs through the jackets around the cylinders. The deck is machined flat so one head gasket can seal combustion, coolant and oil at the same time. The rear face carries the gear case, because the DD15's timing gears are at the flywheel end."},
 {id:'bearings',s:'rot',n:'Main & rod bearings',a:[0.85,-0.5,0.2],ex:[0,-1.6,0],
  fn:"Thin, replaceable steel-backed shells that the crank journals and rod big ends turn on.",
  mech:"Hydrodynamic lubrication: the turning journal drags oil into a wedge-shaped film, so metal never touches metal while it runs. Thrust surfaces at one main bearing limit crankshaft end play. Upper and lower shells are not always the same part, so note which goes where before you strip them."},
 {id:'crankshaft',s:'rot',n:'Crankshaft',a:[-0.85,-1.0,0.9],ex:[0,-3.2,0],
  fn:"Turns the straight-line push of six pistons into rotation at the flywheel.",
  mech:"Six crankpins in three pairs (1 & 6, 2 & 5, 3 & 4) spaced 120° apart, so a cylinder fires every 120° in the order 1-5-3-6-2-4. Counterweights opposite each throw balance the rotating mass. Forged steel with hardened journals. On the DD15 the crank gear that drives the timing train is at the rear, right next to the flywheel."},
 {id:'mainCaps',s:'struct',n:'Main bearing caps',a:[2.55,-0.7,0.6],ex:[0,-4.6,0],
  fn:"Clamp the crankshaft into the block.",
  mech:"Each cap is machined together with the block (line-bored), so caps are numbered and fit only one position and one way round. Bolt clamp load holds the shells in 'crush' so they cannot spin."},
 {id:'liners',s:'struct',n:'Cylinder liners',a:[-4.25,3.1,0.8],ex:[0,3.2,0],cut:'clip',
  fn:"Replaceable cylinder walls that the pistons slide in, so a worn or scored bore is fixed with a new liner instead of a rebore.",
  mech:"Each liner's top flange sits in a counterbore in the block and stands very slightly above the deck. That protrusion is what lets the head gasket clamp the liner and seal the combustion chamber, so it is measured on every liner during a build. The liner type and its seals come from the service literature for your serial number."},
 {id:'pistons',s:'rot',n:'Pistons',a:[4.25,4.5,0.3],ex:[0,5.6,0],
  fn:"Seal the bottom of the combustion chamber and pass cylinder pressure to the connecting rod.",
  mech:"Steel pistons with a bowl in the crown. The bowl shape and the injector's spray pattern work together to mix fuel and air for a fast, clean burn. Oil jets in the block spray the underside of each piston to keep the crown cool."},
 {id:'rings',s:'rot',n:'Piston rings',a:[2.55,3.95,0.7],ex:[0,6.4,0],
  fn:"Seal compression, control oil, and carry heat from the piston into the liner.",
  mech:"The top compression ring takes most of the gas load. The second ring finishes sealing and scrapes oil down. The oil control ring leaves a thin film on the liner wall and returns the rest through drain holes."},
 {id:'wristPins',s:'rot',n:'Piston (wrist) pins',a:[0.85,3.3,0.6],ex:[0,5.6,1.8],
  fn:"The pivot joint between piston and connecting rod.",
  mech:"Free to turn in both the piston bosses and the rod's small end. Retaining rings stop it sliding out against the liner wall."},
 {id:'rods',s:'rot',n:'Connecting rods',a:[-2.55,1.7,0.5],ex:[0,1.0,3.6],
  fn:"Link each piston to its crankpin.",
  mech:"A slider-crank: the rod angle swings as the crank turns, turning straight-line force into torque, with the most leverage around 70–90° after top dead centre. Each big-end cap is matched to its own rod, so rods and caps stay together and go back the same way round."},
 {id:'flywheel',s:'rot',n:'Flywheel & ring gear',a:[-6.6,-1.3,1.3],ex:[-3.8,0,0],
  fn:"Stores energy to smooth out the gaps between power strokes, carries the starter ring gear, and mounts the clutch.",
  mech:"Its inertia resists speed changes: it absorbs energy on each power stroke and gives it back while the other cylinders are compressing."},
 {id:'flywheelHousing',s:'struct',n:'Flywheel housing & rear gear cover',a:[-6.1,2.4,1.4],ex:[-2.6,0,0],cut:'clip',
  fn:"Closes the rear gear train, holds the rear crankshaft seal and the starter, and bolts the transmission to the engine.",
  mech:"On the DD15 the timing gears sit between the block and the flywheel housing, so this housing is also the back cover of the gear train. Its bore and face must run true to the crankshaft centreline so the transmission input shaft lines up; both are checked with a dial indicator."},
 {id:'damper',s:'rot',n:'Viscous vibration damper',a:[6.1,-1.15,0.5],ex:[6.0,0,0],
  fn:"Controls crankshaft torsional vibration at the front of the engine.",
  mech:"A heavy inertia ring floats in silicone fluid inside a sealed housing. When the crank twists back and forth, the fluid shears and turns that vibration into heat. A dented, leaking or swollen damper is replaced, because the ring can bind and stop working."},
 {id:'gearTrain',s:'rot',n:'Rear gear train',a:[-5.6,3.6,-0.4],ex:[-1.9,0,0],
  fn:"Drives both camshafts, the high-pressure fuel pump and the air compressor in exact time with the crankshaft, and takes the turbo compound's drive back into the crank.",
  mech:"Crank gear → bull gear → idlers → the two camshaft gears. Putting the train at the flywheel end, where the crankshaft twists least, keeps cam and injection timing steadier and the gears quieter than at the damper end. Idlers change direction and distance, not timing. Gear backlash is set at assembly; the service literature gives the procedure for the adjustable idler."},
 {id:'camGear',s:'valve',n:'Camshaft gears (intake & exhaust)',a:[-5.6,6.9,-0.9],ex:[-1.9,8.6,0],
  fn:"Turn both overhead camshafts at exactly half crankshaft speed.",
  mech:"Both cam gears are driven off the top idler of the rear gear train. The gearing works out to one cam turn for every two crank turns: one complete four-stroke cycle. Both cams are timed to the crank at cylinder 1 top dead centre with the marks or the timing tool the service literature calls for. One tooth out on either gear puts that cam's valve events out on every cylinder."},
 {id:'gearHousing',s:'struct',n:'Rear gear case',a:[-5.3,5.2,-1.6],ex:[-1.2,0,0],cut:'clip',
  fn:"Locates the gear train shafts at the rear of the block and head.",
  mech:"Dowel-located to the block so the idler shafts hold the right centre distance between gears, which sets backlash. Its joint to the block and head is sealed, since it holds oil splash from the gear train."},
 {id:'frontCover',s:'struct',n:'Front cover & crankshaft seal',a:[5.6,2.6,1.3],ex:[4.6,0,0],cut:'clip',
  fn:"Closes the front of the block, carries the front crankshaft seal and supports the front accessory drive.",
  mech:"The lip seal rides on the crankshaft or damper hub. Correct installed depth and a clean, undamaged sealing surface are what keep it dry. With the timing gears at the rear, the front end only carries the damper and belt-driven accessories."},
 {id:'oilPan',s:'lube',n:'Oil pan (sump)',a:[1.5,-2.4,1.4],ex:[0,-6.9,0],cut:'clip',
  fn:"The engine oil reservoir and the lower seal of the crankcase.",
  mech:"Oil drains back here from the whole engine. The sump shape and baffles keep the pickup covered when the truck brakes, climbs or descends."},
 {id:'headGasket',s:'struct',n:'Cylinder head gasket',a:[2.2,4.4,1.3],ex:[0,7.2,0],cut:'clip',
  fn:"Seals combustion gas, coolant and oil between block and head.",
  mech:"Multi-layer steel with embossed beads that concentrate clamping force around each bore and passage. It only seals if the liners stand proud by the right amount and the head bolts are tightened correctly."},
 {id:'head',s:'struct',n:'Cylinder head',a:[-1.0,5.3,1.33],ex:[0,8.2,0],cut:'clip',
  fn:"Closes the top of the cylinders and carries the valves, the injectors, and both camshafts.",
  mech:"One-piece cross-flow head: air comes in on the left (intake) side and exhaust leaves on the right. The intake camshaft runs along the intake side and the exhaust camshaft along the exhaust side, with each injector standing upright in the middle of its cylinder. Coolant passages surround the valve seats and injector bores, the hottest areas."},
 {id:'valveCover',s:'struct',n:'Valve cover',a:[-2.0,7.4,0.3],ex:[0,15.5,0],cut:'clip',
  fn:"Seals the top of the engine over both camshafts, the rockers, the injectors and the engine brake.",
  mech:"Isolated mounting: the gasket and isolators keep engine vibration out of the cover, which cuts noise and stops the gasket fretting. Oil from the cam and rocker feeds lubricates the valvetrain and drains back to the pan."},
 {id:'valves',s:'valve',n:'Intake & exhaust valves',a:[2.9,4.55,0.3],ex:[0,7.4,0],
  fn:"Open and close the ports: two intake and two exhaust valves per cylinder, 24 in total.",
  mech:"Poppet valves held shut on hardened seats by their springs and pushed open by the rockers through a valve bridge. Exhaust valves use heat-resistant alloy because they sit in the hottest gas."},
 {id:'springs',s:'valve',n:'Valve springs & retainers',a:[0.52,5.95,0.3],ex:[0,8.9,0],
  fn:"Close the valves and keep the valvetrain following the cam profile.",
  mech:"Spring force has to overcome valvetrain inertia at governed speed. If it doesn't, the valve 'floats' and can hit the piston. Split collets lock the retainer to the valve stem."},
 {id:'crossheads',s:'valve',n:'Valve bridges (crossheads)',a:[-1.18,6.2,0.36],ex:[0,9.8,0],
  fn:"Let one rocker arm open a pair of valves at once.",
  mech:"A bridge across the two valve stems: the rocker presses its middle and both valves open together. The bridge must sit square on both stems or one valve opens late and wears its seat."},
 {id:'camshaft',s:'valve',n:'Intake camshaft',a:[3.0,6.3,-1.25],ex:[0,11.6,-1.4],
  fn:"Times the intake valve events: when each pair of intake valves opens, how far and for how long.",
  mech:"One of two overhead camshafts (DOHC). It runs in bearing caps on the intake side of the head and turns at half crank speed off the rear gear train. Each lobe has a base circle (valve shut) and a nose (valve open); the roller on the rocker arm rides on it."},
 {id:'camshaftEx',s:'valve',n:'Exhaust camshaft',a:[-2.2,6.3,1.3],ex:[0,11.6,1.4],
  fn:"Times the exhaust valve events, and carries the lobes the engine brake uses.",
  mech:"The second overhead camshaft, on the exhaust side of the head, also turning at half crank speed off the rear gear train. Besides the main exhaust lobes it has a small extra lobe for each cylinder, near top dead centre of compression; it does nothing until the engine brake is switched on and takes up its lash."},
 {id:'rockers',s:'valve',n:'Rocker arms & shafts',a:[-2.9,6.65,-0.45],ex:[0,12.6,0],
  fn:"Carry cam lift across to the valves, one set over each camshaft.",
  mech:"Roller-follower rocker arms pivot on rocker shafts. When a lobe lifts the roller, the other end of the arm presses the valve bridge down and both valves open. An adjusting screw and locknut at the valve end set the lash for each arm."},
 {id:'brake',s:'valve',n:'Detroit engine brake',a:[-4.0,7.05,0.5],ex:[0,13.6,0],
  fn:"A compression-release engine brake that slows the truck without using the service brakes.",
  mech:"Built into the exhaust valvetrain. When the driver selects braking, the MCM energises the brake solenoid valves, which send engine oil to pistons in the brake housing. They take up the brake lash so the small brake lobes on the exhaust camshaft can open an exhaust valve near top dead centre on the compression stroke. The compressed air escapes instead of pushing the piston back down, so the engine absorbs power. The brake is staged by groups of three cylinders, giving a low and a high setting."},
 {id:'fuelPump',s:'fuel',n:'High-pressure fuel pump',a:[-4.6,1.4,-2.6],ex:[-1.4,-0.6,-2.6],
  fn:"Takes filtered fuel from the low-pressure side and pumps it up to rail pressure.",
  mech:"Gear-driven from the rear gear train. A low-pressure stage draws fuel through the filters and a piston (plunger) stage compresses it into the rail. The MCM controls how much fuel reaches the pumping stage with a metering valve, and that is how it holds rail pressure at target. ACRS rail pressure is moderate (up to around 900 bar); the injectors raise it the rest of the way."},
 {id:'fuelRail',s:'fuel',n:'Common rail (accumulator)',a:[-1.0,4.1,-1.6],ex:[0,0,-3.2],
  fn:"Stores fuel under pressure for all six injectors.",
  mech:"Because pressure is stored, injection doesn't depend on engine speed the way a mechanical pump does. On the ACRS the rail runs at moderate pressure and each injector's amplifier multiplies it for the main injection. The rail pressure sensor reports to the MCM, and a pressure-limiting function protects the system."},
 {id:'hpLines',s:'fuel',n:'High-pressure fuel lines',a:[2.55,4.3,-1.55],ex:[0,0,-2.4],
  fn:"Carry fuel from the pump to the rail, and from the rail to each cylinder.",
  mech:"Thick-wall steel lines with formed ends that seal metal to metal. Fuel at rail pressure can pierce skin, so never loosen a line or feel for leaks by hand on a running engine. Lines that the service literature lists as one-time-use are replaced after removal."},
 {id:'connectors',s:'fuel',n:'High-pressure inlet connectors',a:[-2.55,4.7,-1.4],ex:[0,8.2,-2.2],
  fn:"Carry fuel from each high-pressure line through the cylinder head to the side of the injector.",
  mech:"A short pressure pipe in the head whose tip seats against the injector's fuel inlet when it is clamped. The injector must be held down first, so the connector seats on an injector that can't move. A burred, dirty or misaligned seat leaks fuel inside the head and robs pressure."},
 {id:'injectors',s:'fuel',n:'ACRS amplified injectors',a:[0.85,6.35,0],ex:[0,10.6,0],
  fn:"Spray a precisely timed, metered fuel charge into each cylinder, at higher pressure than the rail stores.",
  mech:"Each injector has its own amplifier (a stepped piston) and two solenoid valves: one for the needle, one for the amplifier. With only the needle solenoid energised, fuel sprays at rail pressure, which suits small pilot and post injections. When the MCM also energises the amplifier solenoid, rail pressure acts on the large end of the piston and its small end squeezes the fuel below it, multiplying pressure to roughly 2,100 bar or more for the main injection. Timing the two valves lets the MCM shape the injection."},
 {id:'fuelFilter',s:'fuel',n:'Fuel filter module & water separator',a:[-1.0,1.7,-2.4],ex:[0,-1.5,-3.6],
  fn:"Removes dirt and water before fuel reaches the high-pressure pump.",
  mech:"A housing on the left side of the engine holds the filter elements and a water separator. Common-rail and amplifier parts have clearances measured in microns, so filtration is critical. Water is heavier than diesel, so it settles out for draining. Prime the system after a filter change as the service literature describes."},
 {id:'intakeManifold',s:'air',n:'Intake manifold',a:[1.7,5.55,-1.6],ex:[0,8.2,-2.6],
  fn:"Distributes charge air, mixed with cooled EGR gas, evenly to all six cylinders.",
  mech:"Cooled boost air (with EGR mixed in at the front) runs the length of the manifold and feeds each intake port. Pressure and temperature are measured here for fuelling and EGR control."},
 {id:'intakeConnection',s:'air',n:'EGR mixer & intake inlet',a:[5.1,5.65,-1.65],ex:[1.5,8.2,-2.6],
  fn:"The air inlet at the front of the intake manifold, where cooled EGR gas joins the charge air coming back from the charge air cooler.",
  mech:"The mixer spreads the EGR gas into the air stream so every cylinder gets the same EGR rate. Uneven mixing shows up as one bank running hotter or smokier than the other."},
 {id:'exhaustManifold',s:'exh',n:'Exhaust manifold (split)',a:[3.0,5.3,1.95],ex:[0,8.2,2.6],cut:'ghost',
  fn:"Collects exhaust from all six cylinders and feeds it to the turbine in two separate streams.",
  mech:"Two sections: one group of three cylinders feeds the turbine's smaller scroll and the EGR circuit, and the other group feeds the larger scroll. Slip joints let the manifold grow with heat without cracking or snapping studs."},
 {id:'turbine',s:'exh',n:'Asymmetric turbine housing & wheel',a:[-0.4,6.2,3.25],ex:[0,8.2,4.6],cut:'ghost',
  fn:"Recovers energy from the exhaust to drive the compressor, and provides the back pressure that drives EGR.",
  mech:"The turbine housing has two scrolls of different sizes. The smaller scroll restricts the cylinders feeding it, which raises pressure in that half of the exhaust manifold enough to push EGR gas into the boosted intake. The larger scroll lets the rest of the exhaust through freely, so the engine isn't choked. There are no variable vanes; the housing sizing does the job."},
 {id:'chra',s:'air',n:'Turbo centre (bearing) housing',a:[0.12,5.05,3.3],ex:[0,8.2,5.4],cut:'ghost',
  fn:"Holds the bearings that carry the turbo shaft.",
  mech:"Engine oil floats the shaft on thin oil films at very high speed, then drains back to the crankcase by gravity. A few seconds without oil can destroy it, so pre-lube a new or rebuilt turbo before first start."},
 {id:'compressor',s:'air',n:'Turbo compressor',a:[0.8,5.0,3.45],ex:[0,8.2,6.2],cut:'ghost',
  fn:"Packs more air into the cylinders (boost).",
  mech:"The compressor wheel shares a shaft with the turbine. It flings air outward into the volute, which turns speed into pressure. Compression heats the air, so it goes through the charge air cooler before it reaches the engine."},
 {id:'chargePipes',s:'air',n:'Air inlet & charge-air pipes',a:[4.0,6.95,2.65],ex:[0,8.2,7.2],cut:'ghost',
  fn:"Plumbing from the air cleaner to the turbo, from the turbo to the charge air cooler, and back to the intake.",
  mech:"Hot boosted air leaves the compressor, cools in the chassis-mounted charge air cooler, then returns denser to the EGR mixer. A leak lowers boost, upsets EGR control and raises exhaust temperature."},
 {id:'turboCompound',s:'exh',n:'Turbo compound (power turbine)',a:[-2.6,3.6,3.0],ex:[0,0,4.2],cut:'ghost',
  fn:"Recovers energy left in the exhaust after the turbocharger and returns it to the crankshaft as extra power, which saves fuel at highway load.",
  mech:"Exhaust leaving the turbo's turbine is piped into a second, power turbine. That wheel spins far too fast to drive the crank directly, so a gear reduction brings its speed down and the drive runs back through a fluid coupling into the rear gear train. Fitted to EPA07 through GHG14 DD15s. Its own shaft seals and bearings are oiled by the engine, so worn seals can put oil into the exhaust."},
 {id:'tcCoupling',s:'exh',n:'Turbo compound fluid coupling',a:[-5.0,1.4,2.2],ex:[-1.0,0,3.6],cut:'ghost',
  fn:"Connects the turbo compound drive to the rear gear train while isolating the high-speed turbine from crankshaft vibration.",
  mech:"A fluid (hydrodynamic) coupling: two vaned wheels face each other in a housing filled with engine oil. Oil flung by one wheel drives the other, so power passes with a little slip and no rigid connection. The crank's torsional shocks never reach the turbine gearing, and the turbine can't drive the engine harshly. It depends on a steady oil supply."},
 {id:'exhaustOutlet',s:'exh',n:'Exhaust outlet to aftertreatment',a:[-1.1,0.6,3.5],ex:[0,-1.0,5.4],cut:'ghost',
  fn:"Carries exhaust from the turbo compound to the aftertreatment system.",
  mech:"Downstream (not shown): the DOC burns hydrocarbons and CO, the DPF traps soot, and on EPA10 and later engines SCR with DEF converts NOx into nitrogen and water. A doser can add a small amount of fuel ahead of the DOC to raise exhaust temperature for an active DPF regeneration."},
 {id:'egrCooler',s:'egr',n:'EGR cooler',a:[3.6,6.75,2.3],ex:[0,9.4,3.4],cut:'ghost',
  fn:"Cools recirculated exhaust gas before it re-enters the engine.",
  mech:"Exhaust runs through tubes surrounded by engine coolant. Cooler, denser EGR gas lowers peak combustion temperature, which cuts NOx formation. A leaking cooler puts coolant into the intake: watch for coolant loss with white smoke or a pressurised cooling system."},
 {id:'egrValve',s:'egr',n:'EGR valve (hot side)',a:[1.9,6.15,2.3],ex:[0,9.4,3.0],cut:'ghost',
  fn:"Meters how much exhaust gas is recirculated.",
  mech:"An MCM-controlled valve on the hot side, ahead of the cooler, fed by the half of the exhaust manifold that the turbine's small scroll pressurises. When it opens, that exhaust back pressure pushes gas through the cooler toward the intake. The MCM closes it when EGR isn't wanted. Hot-side valves are prone to soot build-up, which makes them stick."},
 {id:'egrTube',s:'egr',n:'EGR crossover & venturi (delta-P)',a:[5.8,7.1,0.4],ex:[2.0,9.0,0],cut:'ghost',
  fn:"Carries cooled EGR gas from the cooler across the front of the engine to the mixer, and lets the MCM measure EGR flow.",
  mech:"A venturi section in the tube makes a pressure drop that grows with flow. A differential-pressure (delta-P) sensor reads across it, and the MCM uses that with temperature to work out how much EGR is flowing. Plugged sensor lines or a sooted venturi give false readings."},
 {id:'waterPump',s:'cool',n:'Coolant pump',a:[6.1,2.4,-1.3],ex:[6.4,0,-0.6],
  fn:"Circulates coolant through the block, head, oil cooler, EGR cooler and radiator.",
  mech:"A centrifugal impeller driven from the front of the engine. Flow rises with engine speed. A weeping weep hole is the early warning that the seal is failing."},
 {id:'thermostat',s:'cool',n:'Thermostat housing',a:[5.45,5.55,-1.1],ex:[3.0,8.2,-0.6],
  fn:"Keeps the engine at operating temperature.",
  mech:"Wax-pellet thermostats. When coolant reaches the rated temperature the wax melts and expands, opening the path to the radiator. Until then coolant bypasses straight back to the pump so the engine warms up quickly."},
 {id:'oilPump',s:'lube',n:'Oil pump & pickup',a:[4.0,-1.2,0.5],ex:[0,-6.0,0],
  fn:"Pressurises the lubrication system.",
  mech:"A gear-driven positive-displacement pump pulls oil through the pickup screen. A regulating valve limits pressure and returns the excess to the pan."},
 {id:'oilCooler',s:'lube',n:'Oil cooler',a:[1.8,1.7,-1.75],ex:[0,0,-2.6],
  fn:"Uses engine coolant to remove heat from the oil.",
  mech:"A plate-type heat exchanger: oil and coolant flow through alternating passages. A leaking cooler mixes the two, which shows as oil in the coolant or coolant in the oil."},
 {id:'oilFilter',s:'lube',n:'Oil filter',a:[1.4,1.85,-2.4],ex:[0,-1.5,-3.2],
  fn:"Cleans the oil before it reaches the bearings.",
  mech:"A replaceable element in a housing on the left side. If it plugs, a bypass valve still lets oil through so the bearings are never starved, though that oil is unfiltered. Use the element and service interval the literature gives."},
 {id:'fan',s:'cool',n:'Fan hub & fan',a:[6.75,5.7,0],ex:[8.6,0,0],cut:'ghost',
  fn:"Pulls air through the radiator and charge air cooler.",
  mech:"A clutch in the hub engages the fan only when cooling is needed, which saves horsepower and fuel. The engine brake can call for the fan too, since a running fan adds retarding power."},
 {id:'alternator',s:'elec',n:'Alternator',a:[5.2,1.5,2.25],ex:[6.0,0,2.0],cut:'ghost',
  fn:"Charges the batteries and powers the truck's electrics.",
  mech:"Belt-driven. A spinning magnetic field induces AC in the stator windings, and diodes rectify it to DC."},
 {id:'belt',s:'acc',n:'Belt & automatic tensioner',a:[6.25,0.95,1.0],ex:[7.0,0,0],
  fn:"Drives the front accessories (fan, alternator, coolant pump) from the crank pulley.",
  mech:"A poly-V serpentine belt. The spring-loaded tensioner keeps tension constant as the belt wears and stretches."},
 {id:'airCompressor',s:'acc',n:'Air brake compressor',a:[-4.5,4.6,-2.5],ex:[-1.2,0,-3.0],
  fn:"Supplies compressed air for the truck's air brakes and suspension.",
  mech:"A piston compressor driven from the rear gear train. A governor tells it when to pump and when to unload. Oil passing the rings ends up in the air system, which is why a worn compressor shows as oil at the air dryer."},
 {id:'starter',s:'elec',n:'Starter motor',a:[-4.8,0.55,2.15],ex:[-2.4,0,2.6],cut:'ghost',
  fn:"Cranks the engine for starting.",
  mech:"An electric motor. The solenoid pushes the pinion into the flywheel ring gear, then closes the high-current contacts."},
 {id:'ecm',s:'elec',n:'Motor control module (MCM)',a:[-2.2,3.65,-1.5],ex:[0,0,-3.8],
  fn:"The engine's computer. It fires both solenoids in every injector and controls rail pressure, the EGR valve and the engine brake stages.",
  mech:"It reads crank and cam position, pressures and temperatures many times per revolution and calculates injection timing and quantity. It talks over the vehicle datalink to the CPC (Common Powertrain Controller) in the cab, which handles the vehicle side (accelerator pedal, cruise, speed limits) and passes the torque request to the MCM. On EPA10 and later engines an aftertreatment control module (ACM) runs the aftertreatment."},
 {id:'crankSensor',s:'elec',n:'Crankshaft position sensor',a:[-6.0,3.0,0.6],ex:[-3.0,0.8,0.8],cut:'ghost',
  fn:"Tells the MCM crankshaft speed and exact position.",
  mech:"A magnetic pickup in the flywheel housing reads a toothed target that turns with the crank. A gap in the tooth pattern marks a reference point, so the MCM knows where every piston is."},
 {id:'camSensor',s:'elec',n:'Camshaft position sensor',a:[-5.45,7.45,0.9],ex:[-2.4,8.6,0.4],cut:'ghost',
  fn:"Tells the MCM which part of the 720° cycle the engine is in.",
  mech:"Crank position alone can't tell compression from exhaust, because both pass top dead centre. The cam signal resolves it, so the right injector fires. It also lets the MCM check that crank and cam timing still agree."},
 {id:'imap',s:'elec',n:'Intake manifold pressure/temp sensor',a:[0.3,5.85,-1.6],ex:[0,8.8,-2.6],
  fn:"Measures boost pressure and charge-air temperature.",
  mech:"Lets the MCM work out how much air is in the cylinders, then control EGR and fuelling to suit."},
 {id:'railSensor',s:'elec',n:'Rail pressure sensor',a:[-4.6,4.15,-1.5],ex:[-0.8,0,-3.2],
  fn:"Measures common-rail fuel pressure.",
  mech:"Closed-loop control: the MCM adjusts the pump's metering valve until measured rail pressure matches its target."},
 {id:'coolantSensor',s:'elec',n:'Coolant temperature sensor',a:[5.45,5.85,-0.6],ex:[3.0,8.8,-0.6],
  fn:"Measures engine coolant temperature.",
  mech:"A thermistor whose resistance changes with temperature. Used for fuelling, fan control and engine protection."},
 {id:'oilSensor',s:'elec',n:'Oil pressure sensor',a:[1.95,0.95,-1.9],ex:[0,-0.5,-3.0],
  fn:"Measures engine oil pressure.",
  mech:"Drives the gauge and engine protection: low oil pressure triggers a warning, derate or shutdown."},
 {id:'turboSensor',s:'elec',n:'Turbo speed sensor',a:[0.15,6.0,3.2],ex:[0,8.9,5.4],cut:'ghost',
  fn:"Measures turbocharger shaft speed.",
  mech:"Lets the MCM protect the turbo from overspeed, which matters most at high altitude and under heavy EGR."},
];


/* ================= BUILD PROCESS (out-of-frame build on a stand) ================= */
export const STEPS=[
 {t:'Prepare the cylinder block',p:['block'],why:"Everything locates off the block, so it is cleaned, inspected and measured before a single part goes on.",
  std:["Wash or hot-tank; blow out every oil gallery, piston cooling jet passage and coolant passage","Pressure-test for cracks","Check deck flatness with a straightedge and feeler gauge","Inspect main bores and liner counterbores for damage and correct depth","Check the rear face where the gear case seals; chase threads and fit new plugs"]},
 {t:'Upper main bearing shells',p:['bearings'],why:"Shells go in before the crank. Their positions and oil holes are only visible with the crank out.",
  std:["Shell backs and block bores clean and dry","Locating tangs seated in their notches; oil holes lined up with the block feeds","Thrust bearing in its specified position","Lubricate bearing faces with clean engine oil"]},
 {t:'Crankshaft',p:['crankshaft'],why:"The crank sets the reference for every rotating and timing part that follows, including the rear gear train.",
  std:["Measure every journal for diameter, taper and out-of-round","Crack-check and inspect journal finish","Check the rear crank gear for damaged or worn teeth","Lower in level with a lifting fixture; never let a journal hit a shell edge"]},
 {t:'Main bearing caps',p:['mainCaps'],why:"Clamping the crank now lets you confirm it turns freely and has correct end play before anything else drags on it.",
  std:["Caps in numbered positions, facing the right way","Lubricate bolt threads and under the heads as the literature specifies","Tighten in the specified sequence and stages, then angle-turn","Crank turns by hand; measure end play with a dial indicator"]},
 {t:'Cylinder liners',p:['liners'],why:"Liner protrusion must be measured on the bare block. It decides whether the head gasket will seal.",
  std:["New liner seals as the kit supplies, lubricated only as the literature specifies","Install with the liner tool; never hammer","Clamp down and measure protrusion at several points on each liner","Protrusion in spec and within the allowed difference between neighbouring liners"]},
 {t:'Piston & rod assemblies',p:['pistons','rings','wristPins','rods'],why:"Pistons go in after the liners are set and before the head closes off the top.",
  std:["Check ring end gap in the liner","Fit rings with an expander, identification marks up, gaps staggered","New pin retaining rings, fully seated in their grooves","Piston orientation mark toward the front","Check every piston cooling jet is in place and aimed","Use a ring compressor and guide the rod onto the journal without nicking it","Each cap stays with its own rod; tighten then angle-turn; check side clearance"]},
 {t:'Oil pump & pickup',p:['oilPump'],why:"The pump mounts low in the crankcase and is only reachable before the pan goes on.",
  std:["Prime the pump with clean oil","New pickup seal; support brackets tight","Check drive gear backlash"]},
 {t:'Rear gear case',p:['gearHousing'],why:"The case carries the idler shafts at the rear, so it must be on and true before any timing gear goes in.",
  std:["Clean mating faces on block and head; apply the specified sealant","Seat on its dowels; tighten in sequence","Check the case face is flush where the flywheel housing will seal"]},
 {t:'Rear gear train',p:['gearTrain'],why:"Cylinder 1 is set at top dead centre now, and every later timing step (both cams, the fuel pump, the turbo compound drive) references this train.",
  std:["Crank gear, bull gear and idlers fitted; idler shafts and bushings lubricated","Cylinder 1 at TDC with the timing marks aligned","Set the adjustable idler for backlash as the literature describes","Measure backlash between each gear pair with a dial indicator"]},
 {t:'Flywheel housing & rear seal',p:['flywheelHousing'],why:"The housing closes the rear gear train and carries the rear seal, so it goes on once the train is timed and checked.",
  std:["Sealant on the mating face as specified","Install the new rear seal to the correct depth with the installer","Dial-indicate housing bore and face runout to the crankshaft"]},
 {t:'Flywheel',p:['flywheel'],why:"Fitted once the housing is aligned, so runout can be measured against a true reference.",
  std:["Clean the crank flange and flywheel bore","New capscrews if specified; tighten in a cross pattern","Measure flywheel face and bore runout"]},
 {t:'Oil pan',p:['oilPan'],why:"Closes the bottom end once everything inside has been measured and checked.",
  std:["New gasket; sealant at joints only where specified","Tighten in the specified sequence"]},
 {t:'Cylinder head gasket',p:['headGasket'],why:"Fitted only after liner protrusion has been confirmed.",
  std:["Deck and head faces clean and dry","No oil or coolant left in bolt holes (it can hydraulic-lock and crack the block)","Gasket fitted dry on its dowels, correct way up"]},
 {t:'Cylinder head assembly',p:['head','valves','springs'],why:"Valves and springs are fitted to the head on the bench, then the whole assembly is lifted on.",
  std:["Pressure-test the head and check flatness","Grind valve seats and faces; measure valve recess or protrusion","Test spring free length and load","New head bolts, or measure bolt length as the literature specifies","Lubricate bolts; tighten in sequence and stages, then angle-turn"]},
 {t:'Valve bridges',p:['crossheads'],why:"They sit on the valve stems and must be in place before the rockers go on.",
  std:["Each bridge sits squarely on both valve stems","Lubricate the contact faces"]},
 {t:'Injectors',p:['injectors'],why:"Each injector is clamped before its inlet connector goes in, so the connector seats on an injector that can't move.",
  std:["Clean the injector bores; new sealing washer and O-rings","Fit and tighten the hold-down clamp first","Record each injector's calibration code for programming into the MCM","Keep every fuel opening capped until it is connected"]},
 {t:'High-pressure inlet connectors',p:['connectors'],why:"With the injectors held down, the connectors can be seated into the injector inlets.",
  std:["Inspect connector tips for burrs or damage and replace if found","Seat the connector into the injector inlet, then tighten its retainer","Under-tightening leaks; over-tightening damages the seat"]},
 {t:'Camshafts & cam gears',p:['camshaft','camshaftEx','camGear'],why:"Both cams are timed to the crank through the rear gear train, which is already set at TDC.",
  std:["Coat lobes and journals with assembly lube","Intake cam on the intake side, exhaust cam (with the brake lobes) on the exhaust side","Cylinder 1 at TDC; set both cams with the timing marks or timing tool","Tighten bearing caps in sequence; check end play on each cam","Check cam gear backlash to the idler"]},
 {t:'Rocker arms & shafts',p:['rockers'],why:"Rockers go on once both cams and the valve bridges are in.",
  std:["Lubricate shafts and rollers; check rollers turn freely without flat spots","Intake and exhaust rocker sets on their own shafts","Tighten the shaft capscrews in sequence"]},
 {t:'Engine brake & valve lash',p:['brake'],why:"Lash is set on the finished valvetrain, at the barring positions for each cylinder.",
  std:["Bar the engine over by hand to each lash-setting position (never with the starter)","Set intake and exhaust lash with a feeler gauge while the valves are fully closed","Fit the brake housings; set engine brake lash","Recheck every lash after tightening the locknuts"]},
 {t:'Valve cover',p:['valveCover'],why:"Seals the top end once lash has been set and checked.",
  std:["New gasket and isolators","Tighten in sequence; don't over-tighten an isolated cover"]},
 {t:'Front cover, seal & damper',p:['frontCover','damper'],why:"Closes the front of the block and carries the damper the belt drive runs from.",
  std:["Fit the new front seal with its installer, following the seal's lubrication instructions","Inspect the viscous damper and replace it if dented, leaking or out of spec","Tighten damper capscrews in a cross pattern"]},
 {t:'Fuel system',p:['fuelPump','fuelRail','hpLines','fuelFilter'],why:"Fuel parts go on late so they stay sealed and clean for as long as possible.",
  std:["Absolute cleanliness: uncap each port only at the moment it is connected","Check the pump drive gear backlash at the rear gear train","Replace high-pressure lines wherever the literature requires it after removal","Tighten line nuts; fit every support clamp","New filter elements"]},
 {t:'Intake manifold & EGR mixer',p:['intakeManifold','intakeConnection'],why:"Goes on after the inlet connectors, which it partly covers.",
  std:["New gaskets; tighten in sequence","Check for debris in the ports before fitting"]},
 {t:'Exhaust manifold',p:['exhaustManifold'],why:"The base the turbocharger and the hot-side EGR valve mount on.",
  std:["New gaskets; high-temperature anti-seize on studs","Slip joints assembled free to move","Tighten in sequence; re-tighten after a heat cycle if specified"]},
 {t:'Turbocharger',p:['turbine','chra','compressor'],why:"Mounted on the finished exhaust manifold, with oil feed and drain lines from the block.",
  std:["Check shaft axial and radial play; inspect both wheels for damage","Pre-lube the centre housing with clean oil through the feed port","New gaskets; the oil drain must run downhill with no kinks"]},
 {t:'Turbo compound & fluid coupling',p:['turboCompound','tcCoupling'],why:"The power turbine takes exhaust straight from the turbo, and its drive engages the rear gear train, so it goes on once both are in place.",
  std:["Inspect the power turbine wheel and check shaft play","Check the coupling and the drive gear for wear; mesh the drive gear with the gear train","New seals; oil supply and drain lines clean, routed and tight","Pre-lube as the literature specifies","V-band clamps at the turbo and outlet seated evenly all the way around"]},
 {t:'Air & exhaust plumbing',p:['chargePipes','exhaustOutlet'],why:"Connects the turbo to the air cleaner and charge air cooler, and the turbo compound to the aftertreatment.",
  std:["Clamps tightened; leak-test the charge air system","Exhaust clamps and V-bands seated evenly all the way around"]},
 {t:'EGR system',p:['egrValve','egrCooler','egrTube'],why:"Bridges the finished exhaust side to the intake mixer at the front.",
  std:["New gaskets; pressure-test the cooler for coolant leaks","EGR valve moves freely and its connector is latched","Delta-P sensor lines clear and connected to the right ports"]},
 {t:'Cooling & lube components',p:['waterPump','thermostat','oilCooler','oilFilter'],why:"External components that complete the coolant and oil circuits.",
  std:["New seals and gaskets","Oil cooler pressure-tested","New oil filter element"]},
 {t:'Accessory drive & air compressor',p:['fan','alternator','belt','airCompressor'],why:"The belt-driven accessories need the front cover, damper and coolant pump; the air compressor takes its drive from the rear gear train.",
  std:["Check pulley alignment","Belt routed correctly; tensioner moves freely through its range","Air compressor drive gear backlash checked at the rear gear train"]},
 {t:'Starter, MCM & sensors',p:['starter','ecm','crankSensor','camSensor','imap','railSensor','coolantSensor','oilSensor','turboSensor'],why:"Electronics go on last so they can't be damaged during heavy assembly.",
  std:["Sensors clean, new O-rings, correct air gap where adjustable","Harness connectors fully latched","Program injector calibration codes and engine data into the MCM with DiagnosticLink","Battery cables and ground straps clean and tight"]},
 {t:'First start & commissioning',p:[],why:"The engine is complete. These checks protect a fresh build in its first minutes.",
  std:["Fill with oil and coolant; bleed air from the cooling system","Prime the fuel system until it is free of air","Pre-lube until oil pressure shows before firing","Start and idle; confirm oil pressure immediately and check for leaks everywhere","Clear fault codes, warm up, recheck levels and any re-tighten items"]},
];


export const flows=X=>[
 {k:'Air',c:0x5aa9ff,pts:[[7.6,5.3,3.4],[4.5,5.4,3.4],[2.6,5.5,3.3],[1.4,5.45,2.95],[0.8,5.45,2.95],[0.7,5.97,3.05],[0.7,6.33,3.3],[1.3,6.75,2.85],[3,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]]},
 {k:'Air',c:0x7cc0ff,pts:[[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.0,5.25,-1.6],[4.5,5.2,-1.56],[-4.6,5.2,-1.56]]},
 {k:'Exhaust',c:0xff5d4d,pts:[[4.4,4.95,1.85],[0.1,4.95,1.85],[-0.05,4.97,2.25],[-0.3,5.1,2.7],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.5,5.35,3.05],[-2.2,4.6,3.0],[-2.55,3.7,2.7],[-2.6,3.0,2.45],[-2.4,2.4,2.3],[-2.0,2.4,2.3],[-1.6,2.45,2.45],[-1.2,2.2,3.0],[-1.1,1.2,3.25],[-1.1,-0.6,3.25]]},
 {k:'Exhaust',c:0xff7a4d,pts:[[-4.4,4.95,1.85],[-0.85,4.95,1.85],[-0.75,4.97,2.25],[-0.5,5.1,2.7],[-0.45,5.45,2.95],[-0.95,5.45,2.95],[-1.5,5.35,3.05],[-2.2,4.6,3.0],[-2.55,3.7,2.7],[-2.6,3.0,2.45],[-2.4,2.4,2.3],[-2.0,2.4,2.3],[-1.6,2.45,2.45],[-1.2,2.2,3.0],[-1.1,1.2,3.25],[-1.1,-0.6,3.25]]},
 {k:'EGR',c:0xb48cff,pts:[[3.6,4.95,1.85],[1.9,4.95,1.85],[1.9,5.3,1.95],[1.9,5.7,2.0],[2.0,6.2,2.05],[2.4,6.3,2.05],[4.9,6.3,2.05],[5.5,6.4,1.6],[5.75,6.85,0.6],[5.75,6.85,-0.6],[5.55,6.4,-1.4],[5.2,5.95,-1.6],[5.0,5.6,-1.6],[4.5,5.2,-1.56],[-4.6,5.2,-1.56]]},
 {k:'Fuel',c:0xffd23f,pts:[[-1.4,0.45,-2.1],[-1.4,1.3,-2.1],[-1.0,1.5,-2.1],[-0.6,1.3,-2.1],[-0.6,0.45,-2.1],[-1.0,0.2,-2.1],[-1.7,0.2,-2.1],[-2.6,0.55,-2.45],[-3.9,1.0,-2.4],[-4.6,1.2,-2.18],[-4.1,1.65,-2.05],[-3.6,2.3,-1.85],[-3.5,3.3,-1.62],[-3.9,3.8,-1.47],[-3.6,3.9,-1.45],[4.3,3.9,-1.45]]},
 ...[1,2,3,4,5,6].map(i=>({k:'Fuel',c:0xffe27a,n:10,pts:[[X(i),4.0,-1.45],[X(i),4.3,-1.52],[X(i),4.6,-1.45],[X(i),4.6,-0.15],[X(i),4.4,0]]})),
 {k:'Coolant',c:0x3fd6b0,pts:[[6.25,2.3,-0.9],[5.4,2.2,-1.05],[3.6,1.3,-1.62],[0.2,1.3,-1.62],[-4.6,2.5,-0.95],[-4.8,4.1,-0.95],[-4.6,5.0,-0.6],[4.6,5.0,-0.6],[5.45,5.1,-0.85],[5.45,5.3,-0.85],[6.35,5.3,-0.85]]},
 {k:'Oil',c:0xe3a35b,pts:[[3.6,-2.65,0.3],[4.0,-2.2,0.4],[4.0,-1.5,0.3],[3.4,-0.9,-1.1],[2.6,1.1,-1.62],[1.4,0.6,-2.1],[1.4,1.4,-2.1],[1.15,0.9,-1.8],[0.0,0.95,-1.35],[-4.8,0.95,-1.35],[-4.8,5.0,-0.3],[-4.8,6.5,-0.45],[4.8,6.5,-0.45]]},
 {k:'Oil',c:0xd8954c,pts:[[-4.8,5.0,-0.3],[-4.9,6.0,0.2],[-4.8,6.5,0.45],[4.8,6.5,0.45]]},
];

// Turning parts other than the crank, rods, pistons and valves (the core moves those). th = crank angle in radians.
// Gear radii (module 0.05): crank 0.4, bull 1.5, mid idler 0.5, top idler 0.6, cams 0.8 (2:1), pump / compressor / TC drive 0.5.
export function spin(A,th){
  const k=0.4;
  A.gC.rotation.x=th;A.gBull.rotation.x=-th*k/1.5;A.gMid.rotation.x=th*k/0.5;A.gTop.rotation.x=-th*k/0.6;
  A.gTc.rotation.x=th*k/0.5;A.gPump.rotation.x=th*k/0.5;A.gAc.rotation.x=-th*k/0.5;
  A.gCamI.rotation.x=th/2;A.gCamE.rotation.x=th/2;A.camI.rotation.x=th/2;A.camE.rotation.x=th/2;
  A.fan.rotation.x=th*1.15;A.fanP.rotation.x=th*1.15;A.wp.rotation.x=th*1.6;A.alt.rotation.x=th*3.1;A.tens.rotation.x=th*3.0;
  A.turb.rotation.x=th*9;A.comp.rotation.x=th*9;A.tcW.rotation.x=th*7;A.tcHub.rotation.x=th*k/0.5;
}

export function builders(h){
const {THREE,D2R,X,S,R,L,DECK,PH,IN_PEAK,EX_PEAK,A,FXMAT,GLOW,MAT,TX,mesh,box,rbox,cyl,hex,torus,tube,shapeYZ,extrudeX,beamYZ,gearGeo,circlesHull,Helix,latheX,voluteGeo,webShape,canister}=h;
const B={};
/* Detroit grey paint for the castings */
const grey=()=>new THREE.MeshPhysicalMaterial({color:0x8e9399,roughness:.46,metalness:.25,map:TX.mottle,bumpMap:TX.cast,bumpScale:.5,clearcoat:.7,clearcoatRoughness:.18});

/* rear gear train, all at x = GX (module 0.05 so every pair meshes) */
const GX=-5.43;
const GC={crank:[0,0],bull:[1.876,-0.3],top:[4.878,0],camI:[5.95,-0.9],camE:[5.95,0.9],tc:[1.876,1.7],pump:[1.2,-2.18]};
(()=>{const a=GC.bull,b=GC.top,R1=2.0,R2=1.1,dy=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dy,dz),p=(d*d+R1*R1-R2*R2)/(2*d),hh=Math.sqrt(Math.max(0,R1*R1-p*p)),uy=dy/d,uz=dz/d;
  GC.mid=[a[0]+p*uy+hh*uz,a[1]+p*uz-hh*uy];GC.ac=[GC.mid[0],GC.mid[1]-1.0];})();
const caseHull=circlesHull([[...GC.crank,0.62],[...GC.bull,1.72],[...GC.mid,0.72],[...GC.top,0.82],[...GC.camI,1.02],[...GC.camE,1.02],[...GC.tc,0.72],[...GC.pump,0.72],[...GC.ac,0.72]]);
const caseShape=hole=>{const s=shapeYZ(caseHull);if(hole){const p=new THREE.Path();p.absarc(0,0,hole,0,Math.PI*2,true);s.holes.push(p);}return s;};
const frontHull=circlesHull([[0,0,1.0],[2.3,-0.9,0.5],[3.6,0,0.55],[1.0,1.95,0.35]]);

/* cam lobe with a chosen nose height (the core's lobe() has a fixed one) */
function lobeN(x,noseDeg,lift,w,m){const pts=[];for(let b=0;b<360;b+=3){const d=((b-noseDeg)%360+540)%360-180;const rr=0.2+(Math.abs(d)<60?lift*Math.cos(Math.PI/2*d/60)**2:0);pts.push([rr*Math.cos(b*D2R),rr*Math.sin(b*D2R)]);}return extrudeX(shapeYZ(pts),x-w,x+w,m);}

/* shared geometries */
const G={
  piston:new THREE.LatheGeometry([[0.001,-0.62],[0.59,-0.62],[0.61,-1.35],[0.68,-1.35],[0.68,-0.55],[0.695,-0.5],[0.695,-0.03],[0.67,0],[0.47,0],[0.41,-0.06],[0.33,-0.2],[0.12,-0.21],[0.001,-0.1]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  ring:(()=>{const g=new THREE.TorusGeometry(0.682,0.02,8,64);g.rotateX(Math.PI/2);return g;})(),
  liner:new THREE.LatheGeometry([[0.70,1.6],[0.81,1.6],[0.81,4.26],[0.895,4.26],[0.895,DECK],[0.70,DECK],[0.70,1.6]].map(([r,y])=>new THREE.Vector2(r,y)),48),
  valve:new THREE.LatheGeometry([[0.001,0],[0.2,0],[0.2,0.03],[0.07,0.13],[0.04,0.22],[0.04,1.66],[0.001,1.66]].map(([r,y])=>new THREE.Vector2(r,y)),24),
  spring:new THREE.TubeGeometry(new Helix(0.11,0.35,6.5),150,0.018,6,false),
};
B.block=g=>{const m=grey(),hw=MAT.zinc(),sm=MAT.steel();
  g.add(extrudeX(shapeYZ([[-0.55,-1.5],[0.85,-1.52],[1.25,-1.38],[1.7,-1.18],[4.0,-1.18],[4.1,-1.3],[DECK,-1.3],[DECK,1.3],[4.1,1.3],[4.0,1.18],[1.7,1.18],[1.25,1.38],[0.85,1.52],[-0.55,1.5]]),-5.25,5.25,m,0.04));
  for(let i=1;i<=6;i++)for(const s of[-1,1]){const b=cyl(.62,.62,2.15,'y',m,X(i),2.88,s*1.04,40);b.scale.z=0.42;g.add(b);g.add(cyl(.15,.15,.05,'z',sm,X(i),3.1,s*1.32));}
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1]){
    g.add(box(.16,2.2,.18,m,x,2.9,s*1.25));g.add(box(.18,1.1,.16,m,x,0.6,s*1.48));
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
  rot.add(cyl(.32,.32,1.1,'x',m,5.85,0,0));rot.add(cyl(.3,.3,1.0,'x',m,-5.55,0,0));rot.add(cyl(.6,.6,.2,'x',m,-5.98,0,0));};
B.liners=g=>{const m=MAT.iron();m.side=THREE.DoubleSide;for(let i=1;i<=6;i++)g.add(mesh(G.liner,m,X(i),0,0));};
B.pistons=g=>{const m=MAT.steel();m.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(mesh(G.piston,m,0,0.88,0));g.add(p);A.pist.push(p);}};
B.rings=g=>{const top=MAT.dark(),m=MAT.gasket();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);[[0.76,top],[0.64,m],[0.50,m]].forEach(([y,mm])=>p.add(mesh(G.ring,mm,0,y,0)));g.add(p);A.ring.push(p);}};
B.wristPins=g=>{const m=MAT.chrome();for(let i=1;i<=6;i++){const p=new THREE.Group();p.position.x=X(i);p.add(cyl(.19,.19,1.0,'x',m,0,0,0));g.add(p);A.pin.push(p);}};
const ROD_SHAPE=(()=>{const s=shapeYZ(circlesHull([[0,0,0.6],[L,0,0.31]],48));for(const[cy,r]of[[0,0.41],[L,0.21]]){const p=new THREE.Path();p.absarc(0,cy,r,0,Math.PI*2,true);s.holes.push(p);}return s;})();
const ROD_RIB=shapeYZ(circlesHull([[0.85,0,0.17],[L-0.55,0,0.09]],24));
B.rods=g=>{const m=MAT.dark(),b=MAT.bronze(),hw=MAT.zinc();b.side=THREE.DoubleSide;for(let i=1;i<=6;i++){const r=new THREE.Group();
  r.add(extrudeX(ROD_SHAPE,-0.15,0.15,m,0.025));
  for(const s of[-1,1])r.add(extrudeX(ROD_RIB,s>0?0.17:-0.21,s>0?0.21:-0.17,m,0.015));
  for(const s of[-1,1]){r.add(box(.36,.02,.2,MAT.black(),0,0,s*0.5));hex(r,0,-0.56,s*0.42,'y',.075,hw);}
  r.add(cyl(.205,.205,.32,'x',b,0,L,0,32,true));
  g.add(r);A.rod.push(r);}};
B.flywheel=g=>{const rot=new THREE.Group();rot.position.x=-6.22;A.fly=rot;g.add(rot);
  rot.add(cyl(2.12,2.12,.36,'x',MAT.dark(),0,0,0,72));rot.add(mesh(gearGeo(120,2.2,.18),MAT.steel(),-0.06,0,0));
  rot.add(cyl(1.55,1.55,.04,'x',MAT.steel(),-0.2,0,0,64));const bm=MAT.steel();for(let k=0;k<8;k++){const a=k/8*Math.PI*2;rot.add(cyl(.07,.07,.1,'x',bm,-0.22,0.45*Math.cos(a),0.45*Math.sin(a),6));}};
B.flywheelHousing=g=>{const m=grey(),hw=MAT.zinc();m.side=THREE.DoubleSide;
  g.add(extrudeX(caseShape(0.42),-5.62,-5.52,m,0.02));                                   // back cover of the rear gear train
  g.add(latheX([[2.2,0],[2.3,0.12],[2.46,0.45],[2.56,0.8],[2.6,0.92],[2.82,0.94],[2.84,1.0],[2.82,1.07],[2.5,1.07]],m,-5.6,0,0,96,-1));
  for(let k=0;k<12;k++){const a=(k+0.5)/12*Math.PI*2,b=box(.5,.3,.07,m,-6.27,2.62*Math.cos(a),2.62*Math.sin(a));b.rotation.x=a;g.add(b);}
  g.add(cyl(.5,.5,.6,'z',m,-5.95,0.05,1.95));g.add(cyl(.18,.18,.3,'y',m,-6.0,2.5,0.6));
  caseHull.filter((_,i)=>i%6===0).forEach(([y,z])=>{const k=0.9;hex(g,-5.64,y*k+GC.bull[0]*(1-k),z*k+GC.bull[1]*(1-k),'x',.06,hw);});
  for(let k=0;k<14;k++){const a=k/14*Math.PI*2;hex(g,-6.71,2.72*Math.cos(a),2.72*Math.sin(a),'x',.07,hw);}};
B.damper=g=>{const rot=new THREE.Group();rot.position.x=6.0;A.damper=rot;g.add(rot);const pm=MAT.steel(),hw=MAT.zinc();
  rot.add(latheX([[0.3,-0.15],[1.06,-0.15],[1.12,-0.1],[1.12,0.1],[1.06,0.15],[0.84,0.15],[0.8,0.09],[0.44,0.09],[0.41,0.16],[0.3,0.16]],MAT.dark(),0,0,0,96));
  rot.add(torus(1.0,.025,'x',MAT.black(),0.15,0,0,72));
  const pv=[[0.3,0.16],[0.72,0.16],[0.8,0.2]];for(let k=0;k<6;k++)pv.push([0.75,0.225+k*0.035],[0.8,0.24+k*0.035]);pv.push([0.8,0.43],[0.7,0.46],[0.3,0.46]);
  rot.add(latheX(pv,pm,0,0,0,72));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;hex(rot,0.5,0.22*Math.cos(a),0.22*Math.sin(a),'x',.06,hw);}};
function gearMesh(T,r,m,y,z){const grp=new THREE.Group();grp.position.set(GX,y,z);grp.add(mesh(gearGeo(T,r,.18),m));grp.add(cyl(Math.min(r*0.35,0.3),Math.min(r*0.35,0.3),.24,'x',MAT.dark(),0,0,0));return grp;}
B.gearTrain=g=>{const m=MAT.steel();
  A.gC=gearMesh(16,0.4,m,...GC.crank);A.gBull=gearMesh(60,1.5,m,...GC.bull);A.gMid=gearMesh(20,0.5,m,...GC.mid);A.gTop=gearMesh(24,0.6,m,...GC.top);
  A.gTc=gearMesh(20,0.5,m,...GC.tc);A.gPump=gearMesh(20,0.5,m,...GC.pump);A.gAc=gearMesh(20,0.5,m,...GC.ac);
  A.gBull.add(cyl(.9,.9,.06,'x',MAT.dark(),0.1,0,0,48));                                                   // bull gear web
  g.add(A.gC,A.gBull,A.gMid,A.gTop,A.gTc,A.gPump,A.gAc);};
B.camGear=g=>{const m=MAT.steel();A.gCamI=gearMesh(32,0.8,m,...GC.camI);A.gCamE=gearMesh(32,0.8,m,...GC.camE);
  for(const gr of[A.gCamI,A.gCamE]){const hw=MAT.zinc();for(let k=0;k<4;k++){const a=k/4*Math.PI*2+0.4;hex(gr,-0.12,0.18*Math.cos(a),0.18*Math.sin(a),'x',.05,hw);}}
  g.add(A.gCamI,A.gCamE);};
B.gearHousing=g=>{const m=grey();g.add(extrudeX(caseShape(0.36),-5.33,-5.25,m));
  const hw=MAT.zinc();caseHull.filter((_,i)=>i%6===3).forEach(([y,z])=>{const k=0.92;hex(g,-5.36,y*k+GC.bull[0]*(1-k),z*k+GC.bull[1]*(1-k),'x',.05,hw);});};
B.frontCover=g=>{const m=grey();g.add(extrudeX(shapeYZ(frontHull),5.25,5.7,m,0.03));g.add(torus(.4,.05,'x',MAT.rubber(),5.72,0,0));
  const bm=MAT.steel();frontHull.filter((_,i)=>i%7===0).forEach(([y,z])=>{const k=0.88;g.add(cyl(.05,.05,.06,'x',bm,5.72,y*k+1.2*(1-k),z*k));});};
function panProf(d,wb){const r=0.28,p=[[-0.6,1.45],[-0.64,1.42]];for(let k=0;k<=6;k++){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),wb-r+r*Math.cos(a)]);}
  for(let k=6;k>=0;k--){const a=k/6*Math.PI/2;p.push([-d+r-r*Math.sin(a),-(wb-r+r*Math.cos(a))]);}p.push([-0.64,-1.42],[-0.6,-1.45]);return shapeYZ(p);}
B.oilPan=g=>{const m=MAT.black();m.side=THREE.DoubleSide;
  g.add(extrudeX(panProf(1.62,1.12),-5.15,1.75,m,0.07));g.add(extrudeX(panProf(2.9,1.0),1.45,5.15,m,0.07));
  for(let k=0;k<5;k++)for(const s of[-1,1])g.add(box(.06,1.0,.07,m,1.9+k*0.75,-2.1,s*1.06));
  g.add(rbox(10.5,0.1,3.1,0.03,m,0,-0.6,0));const hw=MAT.zinc();hex(g,3.0,-2.95,0.4,'y',.1,hw);
  for(let k=0;k<13;k++)for(const s of[-1,1])hex(g,-5.0+k*0.83,-0.69,s*1.5,'y',.06,hw);};
B.headGasket=g=>{g.add(box(10.45,0.04,2.55,MAT.gasket(),0,DECK+0.02,0));};
B.head=g=>{const m=grey(),hw=MAT.zinc();
  g.add(extrudeX(shapeYZ([[4.4,-1.32],[4.52,-1.36],[4.62,-1.28],[5.45,-1.26],[5.58,-1.32],[5.65,-1.3],[5.65,1.3],[5.58,1.32],[5.45,1.26],[4.62,1.28],[4.52,1.36],[4.4,1.32]]),-5.25,5.25,m,0.03));
  for(let i=1;i<=6;i++){g.add(rbox(.82,.5,.12,.05,m,X(i),4.95,1.31));g.add(rbox(.82,.48,.1,.04,m,X(i),5.2,-1.3));}
  for(let k=0;k<7;k++){const x=(3-k)*S;for(const s of[-1,1])g.add(cyl(.13,.13,1.1,'y',m,x,5.05,s*1.3,24));}
  for(const[x,z]of[[4.55,-1.42],[-4.55,-1.42]]){g.add(box(.42,.5,.09,m,x,5.85,z));g.add(torus(.14,.045,'z',m,x,6.2,z));hex(g,x-0.12,5.75,z-0.06,'z',.05,hw);hex(g,x+0.12,5.75,z-0.06,'z',.05,hw);}
};
const VW=1.3,VH=1.5;
const VC_PROF=(()=>{const p=[];for(let k=0;k<=32;k++){const t=k/32*Math.PI,c=Math.cos(t),s=Math.sin(t);p.push([5.7+VH*Math.pow(s,0.55),VW*Math.sign(c)*Math.pow(Math.abs(c),0.4)]);}return p;})();
const vcTop=z=>{const c=Math.pow(Math.min(1,Math.abs(z)/VW),2.5);return 5.7+VH*Math.pow(Math.sqrt(1-c*c),0.55)+0.1;};
B.valveCover=g=>{const m=MAT.black();g.add(extrudeX(shapeYZ(VC_PROF),-5.05,5.05,m,0.1));g.add(rbox(10.5,0.1,2.66,0.03,MAT.dark(),0,5.7,0));
  for(let k=0;k<5;k++)g.add(box(.08,.05,1.4,m,-4.2+k*0.5,vcTop(0)+0.01,0));                                      // stiffening ribs at the rear
  g.add(cyl(.2,.2,.12,'y',MAT.plastic(),2.9,vcTop(-0.55)+0.04,-0.55,32));g.add(box(.3,.06,.06,MAT.plastic(),2.9,vcTop(-0.55)+0.12,-0.55));   // oil fill cap
  g.add(cyl(.12,.12,.25,'x',MAT.plastic(),-5.2,6.7,-0.6,24));                                                    // crankcase breather
  const c=document.createElement('canvas');c.width=1024;c.height=256;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const draw=()=>{const x=c.getContext('2d');x.clearRect(0,0,1024,256);x.fillStyle='#c9cdd2';x.font='700 210px "Barlow Condensed","Arial Narrow",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('DD15',512,140);t.needsUpdate=true;};
  draw();document.fonts&&document.fonts.load('700 100px "Barlow Condensed"').then(draw).catch(()=>{});
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.8),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.35,metalness:.6}));pl.rotation.x=-Math.PI/2;pl.position.set(0.9,vcTop(0)+0.006,0);g.add(pl);
  const hw=MAT.zinc(),iso=MAT.rubber(),by=vcTop(0.85);for(let k=0;k<7;k++)for(const s of[-1,1]){const x=(3-k)*S+(k===6?0.3:0);g.add(cyl(.11,.11,.03,'y',iso,x,by,s*0.85));hex(g,x,by+0.05,s*0.85,'y',.075,hw);}};
B.valves=g=>{const mi=MAT.steel(),me=MAT.hot();for(let i=1;i<=6;i++){for(const[arr,dx,m]of[[A.vI,0.33,mi],[A.vE,-0.33,me]]){const v=new THREE.Group();for(const z of[-0.3,0.3])v.add(mesh(G.valve,m,X(i)+dx,4.42,z));g.add(v);arr.push(v);}}};
B.springs=g=>{const m=MAT.dark(),rm=MAT.steel();for(let i=1;i<=6;i++){for(const[sa,ta,dx]of[[A.sI,A.tI,0.33],[A.sE,A.tE,-0.33]]){const sp=[];const tg=new THREE.Group();
  for(const z of[-0.3,0.3]){const s=mesh(G.spring,m,X(i)+dx,5.65,z);g.add(s);sp.push(s);tg.add(cyl(.13,.13,.04,'y',rm,X(i)+dx,6.0,z,20));}
  g.add(tg);sa.push(sp);ta.push(tg);}}};
B.crossheads=g=>{const m=MAT.steel();for(let i=1;i<=6;i++)for(const[arr,dx]of[[A.chI,0.33],[A.chE,-0.33]]){const c=new THREE.Group();c.add(box(.12,.08,.74,m,X(i)+dx,6.12,0));c.add(cyl(.06,.06,.04,'y',m,X(i)+dx,6.17,0,12));g.add(c);arr.push(c);}};
/* the cams turn +th/2 (the rear gear train's direction), so each lobe's nose is drawn at -(peak + phase)/2 */
function camGroup(g,z){const rot=new THREE.Group();rot.position.set(0,5.95,z);g.add(rot);const m=MAT.steel();
  rot.add(cyl(.12,.12,10.5,'x',m,-0.25,0,0));for(let k=0;k<7;k++)rot.add(cyl(.22,.22,.22,'x',m,(3-k)*S,0,0));
  const cm=grey();for(let k=0;k<7;k++){const x=(3-k)*S;g.add(box(.26,.22,.62,cm,x,6.13,z));g.add(box(.26,.12,.62,cm,x,5.71,z));for(const s of[-1,1])hex(g,x,6.27,z+s*0.22,'y',.05,MAT.zinc());}
  return {rot,m};}
B.camshaft=g=>{const {rot,m}=camGroup(g,-0.9);A.camI=rot;for(let i=1;i<=6;i++)rot.add(lobeN(X(i)+0.33,-(IN_PEAK+PH[i-1])/2,0.15,0.08,m));};
B.camshaftEx=g=>{const {rot,m}=camGroup(g,0.9);A.camE=rot;for(let i=1;i<=6;i++){rot.add(lobeN(X(i)-0.33,-(EX_PEAK+PH[i-1])/2,0.15,0.08,m));rot.add(lobeN(X(i)-0.6,-(700+PH[i-1])/2,0.05,0.05,m));}};
/* rocker arms: the exhaust set as drawn, the intake set mirrored across its shaft so the core's rotation still opens the valve */
B.rockers=g=>{const m=MAT.dark(),sm=MAT.steel(),pm=grey();
  const lever=shapeYZ(circlesHull([[0,0,0.15],[-0.27,0.45,0.1],[-0.24,-0.45,0.075]],32));
  for(const z of[-0.45,0.45]){g.add(cyl(.09,.09,10.5,'x',sm,0,6.5,z));for(let k=0;k<7;k++)g.add(box(.22,.85,.26,pm,(3-k)*S,6.07,z));}
  for(let i=1;i<=6;i++)for(const[arr,dx,z]of[[A.rkI,0.33,-0.45],[A.rkE,-0.33,0.45]]){const w=new THREE.Group();w.position.set(X(i)+dx,6.5,z);if(z<0)w.scale.z=-1;
    const r=new THREE.Group();w.add(r);
    r.add(cyl(.15,.15,.17,'x',m,0,0,0));r.add(extrudeX(lever,-0.055,0.055,m,0.012));
    r.add(cyl(.08,.08,.11,'x',sm,0,-0.27,0.45,20));r.add(cyl(.035,.035,.2,'y',sm,0,-0.22,-0.45,8));r.add(cyl(.06,.06,.05,'y',sm,0,-0.16,-0.45,6));
    g.add(w);arr.push(r);}};
B.brake=g=>{const m=MAT.black(),hw=MAT.zinc();
  for(const[x0,x1]of[[0.1,5.0],[-5.0,-0.1]]){const xc=(x0+x1)/2;g.add(rbox(x1-x0,.14,.34,.04,grey(),xc,6.8,0.45));     // two brake housings, three cylinders each
    g.add(rbox(.34,.26,.3,.05,m,xc,7.0,0.45));g.add(box(.14,.08,.16,MAT.plastic(),xc,7.17,0.45));}                     // brake solenoid valve per housing
  for(let i=1;i<=6;i++){g.add(cyl(.1,.1,.2,'y',m,X(i)-0.33,6.95,0.45,16));hex(g,X(i)-0.33,7.08,0.45,'y',.05,hw);}};
B.injectors=g=>{const b=MAT.steel(),n=MAT.dark(),c=MAT.black();for(let i=1;i<=6;i++){const x=X(i);
  g.add(cyl(.04,.05,.3,'y',n,x,4.5,0,12));g.add(cyl(.1,.1,1.25,'y',b,x,5.255,0,20));g.add(cyl(.13,.13,.24,'y',b,x,6.0,0,20));
  g.add(box(.16,.1,.22,c,x,6.17,0));g.add(box(.12,.09,.16,MAT.plastic(),x,6.28,0));                                   // two solenoid valves: needle and amplifier
  g.add(box(.1,.06,.42,n,x,5.75,-0.2));
  const fx=new THREE.Group();fx.position.set(x,4.33,0);fx.visible=false;const sm=new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});FXMAT.add(sm);
  for(let k=0;k<7;k++){const cg=new THREE.ConeGeometry(0.06,0.5,10,1,true);cg.translate(0,-0.25,0);const cm=new THREE.Mesh(cg,sm);cm.rotation.order='YXZ';cm.rotation.set(0,k*360/7*D2R,70*D2R);cm.userData.fx=true;fx.add(cm);}
  g.add(fx);A.spray.push(fx);
  const fm=new THREE.SpriteMaterial({map:GLOW,color:0xff7a2a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});FXMAT.add(fm);const fl=new THREE.Sprite(fm);fl.position.set(x,4.25,0);fl.scale.setScalar(1.3);fl.visible=false;fl.userData.fx=true;g.add(fl);A.flame.push(fl);}};
B.connectors=g=>{const m=MAT.steel(),nm=MAT.bronze();for(let i=1;i<=6;i++){g.add(cyl(.05,.05,1.23,'z',m,X(i),4.6,-0.705,12));g.add(cyl(.1,.1,.14,'z',nm,X(i),4.6,-1.37,6));}};
B.hpLines=g=>{const m=MAT.steel();for(let i=1;i<=6;i++){const x=X(i);g.add(tube([[x,4.02,-1.45],[x,4.25,-1.52],[x,4.5,-1.5],[x,4.6,-1.45]],.035,m,24));}
  g.add(tube([[-4.1,1.6,-2.02],[-3.6,2.3,-1.85],[-3.5,3.3,-1.62],[-3.9,3.78,-1.46]],.04,m,40));};
B.fuelRail=g=>{const m=MAT.steel();g.add(cyl(.13,.13,8.8,'x',m,0,3.9,-1.45));for(const s of[-1,1])g.add(cyl(.15,.15,.12,'x',m,s*4.4,3.9,-1.45,6));
  for(let i=1;i<=6;i++)g.add(cyl(.07,.07,.14,'y',m,X(i),4.02,-1.45,6));g.add(cyl(.07,.07,.14,'y',m,-3.9,3.78,-1.45,6));
  for(const x of[-2.5,0,3])g.add(box(.15,.3,.14,MAT.dark(),x,3.72,-1.36));};
B.fuelPump=g=>{const a=MAT.alu(),d=MAT.dark(),y=GC.pump[0],z=GC.pump[1];
  g.add(latheX([[0.15,0],[0.52,0],[0.52,0.1],[0.38,0.13],[0.38,1.2],[0.3,1.32],[0.15,1.32]],a,-5.25,y,z,48));
  g.add(rbox(.55,.3,.45,.05,d,-4.45,y+0.45,z));g.add(box(.2,.12,.22,MAT.plastic(),-4.45,y+0.65,z));                  // metering valve + connector
  g.add(cyl(.07,.07,.25,'y',MAT.steel(),-4.1,y+0.42,z+0.16,6));                                                      // high-pressure outlet
  const hw=MAT.zinc();for(let k=0;k<4;k++){const t=k/4*Math.PI*2+0.6;hex(g,-5.16,y+0.44*Math.cos(t),z+0.44*Math.sin(t),'x',.05,hw);}};
B.fuelFilter=g=>{const a=MAT.alu(),z=-2.1;g.add(rbox(1.3,.25,.62,.05,a,-1.0,0.2,z));
  for(const x of[-1.4,-0.6]){g.add(cyl(.26,.26,1.05,'y',a,x,0.85,z,36));for(const y of[0.55,1.1])g.add(torus(.265,.02,'y',MAT.dark(),x,y,z));
    g.add(cyl(.22,.22,.12,'y',MAT.black(),x,1.43,z,6));g.add(cyl(.08,.08,.1,'y',MAT.black(),x,1.53,z,6));}               // cartridge housings with caps
  g.add(cyl(.05,.05,.12,'y',MAT.plastic(),-1.0,0.03,z,6));                                                              // water drain
  g.add(tube([[-1.65,0.2,z],[-2.6,0.55,-2.45],[-3.9,1.0,-2.4],[-3.93,1.2,z+0.0]],.05,MAT.rubber(),48));
  g.add(tube([[-0.35,0.2,z],[0.0,0.4,-1.9],[0.2,0.9,-1.75]],.04,MAT.rubber(),24));};
B.ecm=g=>{const b=MAT.black(),a=MAT.alu();g.add(rbox(2.3,1.3,.1,.02,b,-2.2,2.9,-1.47));g.add(box(2.4,1.4,.05,a,-2.2,2.9,-1.39));
  for(let k=0;k<9;k++)g.add(box(.04,1.1,.06,b,-3.15+k*0.24,2.9,-1.55));g.add(box(.5,.18,.16,MAT.plastic(),-2.75,3.6,-1.47));g.add(box(.5,.18,.16,MAT.plastic(),-1.75,3.6,-1.47));
  for(const[x,y]of[[-3.3,2.3],[-3.3,3.5],[-1.1,2.3],[-1.1,3.5]])g.add(cyl(.08,.08,.08,'z',MAT.rubber(),x,y,-1.36,12));};
B.intakeManifold=g=>{const m=MAT.alu(),hw=MAT.zinc();g.add(rbox(9.6,.62,.5,.12,m,-0.1,5.2,-1.56));for(let i=1;i<=6;i++)g.add(rbox(.8,.5,.14,.04,m,X(i),5.2,-1.33));
  for(let k=0;k<12;k++)hex(g,-4.55+k*0.82,5.53,-1.72,'y',.05,hw);};
B.intakeConnection=g=>{const m=MAT.alu();g.add(cyl(.3,.3,.6,'x',m,5.0,5.25,-1.6));g.add(rbox(.55,.58,.6,.08,m,5.0,5.55,-1.6));g.add(torus(.31,.03,'x',MAT.dark(),5.28,5.25,-1.6));
  g.add(cyl(.2,.2,.08,'y',MAT.dark(),5.0,5.86,-1.6,24));};
B.imap=g=>{g.add(cyl(.08,.08,.22,'y',MAT.black(),0.3,5.62,-1.56,16));g.add(box(.14,.1,.18,MAT.plastic(),0.3,5.75,-1.56));};
B.chargePipes=g=>{const a=MAT.alu(),r=MAT.rubber();
  g.add(tube([[0.7,6.33,3.3],[1.3,6.75,2.85],[3.0,6.75,2.7],[6.4,6.6,2.6],[7.6,6.3,2.55]],.24,a,64));
  g.add(tube([[1.35,5.45,2.95],[2.6,5.5,3.3],[4.5,5.4,3.4],[7.6,5.3,3.4]],.33,r,64));
  g.add(tube([[7.6,5.7,-2.5],[6.6,5.5,-2.05],[5.7,5.3,-1.65],[5.3,5.25,-1.6]],.27,a,48));
  for(const[x,y,z]of[[7.6,6.3,2.55],[7.6,5.3,3.4],[7.6,5.7,-2.5]])g.add(torus(z>0&&y<6?.35:.28,.04,'x',MAT.dark(),x,y,z));};
B.exhaustManifold=g=>{const m=MAT.hot(),hw=MAT.zinc();
  // two sections, one per group of three cylinders, each feeding its own turbine scroll
  g.add(cyl(.23,.28,4.7,'x',m,2.25,4.95,1.85));g.add(cyl(.28,.23,4.0,'x',m,-2.6,4.95,1.85));
  for(const x of[2.0,-2.6])g.add(cyl(.33,.33,.2,'x',MAT.iron(),x,4.95,1.85));
  g.add(cyl(.2,.2,.1,'x',m,4.6,4.95,1.85));g.add(cyl(.2,.2,.1,'x',m,-4.6,4.95,1.85));
  for(let i=1;i<=6;i++){const sw=X(i)>0?-0.28:0.28;g.add(tube([[X(i),4.95,1.34],[X(i),4.97,1.52],[X(i)+sw*0.5,4.96,1.7],[X(i)+sw,4.95,1.84]],.19,m,16));
    g.add(rbox(.72,.55,.07,.05,m,X(i),4.95,1.33));
    for(const dx of[-0.27,0.27])for(const dy of[-0.19,0.19])hex(g,X(i)+dx,4.95+dy,1.39,'z',.05,hw);}
  for(const x of[-0.05,-0.75])g.add(cyl(.17,.17,.5,'z',m,x,4.96,2.1));                                                   // twin risers to the divided turbine inlet
  g.add(cyl(.12,.12,.15,'y',m,1.9,5.22,1.88));};                                                                         // EGR take-off boss
B.turbine=g=>{const m=MAT.hot();m.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.36,.5,.07,.27,Math.PI-0.92*Math.PI*2),m,-0.4,5.45,2.95));
  g.add(mesh(voluteGeo(.3,.4,.05,.17,Math.PI-0.92*Math.PI*2),m,-0.08,5.45,2.95));                                      // smaller scroll beside the main one
  g.add(rbox(.95,.36,.62,.06,m,-0.4,4.97,2.6));g.add(box(.04,.3,.6,MAT.iron(),-0.4,4.97,2.6));                           // divided inlet flange
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
B.turboSensor=g=>{g.add(cyl(.05,.05,.25,'y',MAT.black(),0.15,5.83,2.95,12));};
/* turbo compound: power turbine at (y 2.4, z 2.3), shaft to a reduction housing at the rear, drive through the fluid coupling into the gear train */
const TC={x:-2.6,y:2.4,z:2.3};
B.turboCompound=g=>{const m=MAT.hot(),d=MAT.dark(),s=MAT.steel(),hw=MAT.zinc();m.side=THREE.DoubleSide;
  g.add(tube([[-1.0,5.45,2.95],[-1.5,5.35,3.05],[-2.2,4.6,3.0],[-2.55,3.7,2.7],[-2.6,3.2,2.45]],.27,s,48));             // crossover from the turbo outlet
  g.add(torus(.33,.05,'x',d,-1.02,5.45,2.95));
  g.add(mesh(voluteGeo(.38,.52,.07,.24,0.5*Math.PI),m,TC.x,TC.y,TC.z));                                                   // power turbine scroll
  g.add(cyl(.2,.24,.3,'y',m,TC.x,3.15,2.45));g.add(torus(.26,.04,'y',d,TC.x,3.3,2.45));
  g.add(cyl(.42,.42,.45,'x',m,TC.x,TC.y,TC.z));g.add(cyl(.32,.3,.3,'x',m,-2.23,TC.y,TC.z,32,true));
  const w=new THREE.Group();w.position.set(-2.28,TC.y,TC.z);A.tcW=w;g.add(w);const wm=MAT.dark();w.add(cyl(.07,.1,.16,'x',wm,0,0,0,16));
  for(let k=0;k<13;k++){const a=k/13*Math.PI*2;const b=box(.14,.15,.02,wm,0,0.15*Math.cos(a),0.15*Math.sin(a));b.rotation.order='XYZ';b.rotation.set(a,0.5,0);w.add(b);}
  g.add(cyl(.22,.22,1.5,'x',MAT.alu(),-3.58,TC.y,TC.z));for(let k=0;k<5;k++)g.add(torus(.23,.02,'x',d,-3.0-k*0.28,TC.y,TC.z));   // shaft and bearing housing
  g.add(rbox(.5,1.4,1.3,.08,MAT.alu(),-4.55,2.08,2.0));for(const[y,z]of[[1.5,1.45],[2.7,1.45],[1.5,2.55],[2.7,2.55]])hex(g,-4.28,y,z,'x',.05,hw);  // gear reduction housing
  g.add(tube([[-4.3,1.45,1.6],[-3.9,1.05,1.55],[-3.6,0.95,1.5]],.04,s,20));};                                             // oil feed
B.tcCoupling=g=>{const y=GC.tc[0],z=GC.tc[1],a=MAT.alu();a.side=THREE.DoubleSide;
  const hg=new THREE.CylinderGeometry(.36,.36,.45,40,1,true,0.4,Math.PI*1.5);hg.rotateZ(-Math.PI/2);g.add(mesh(hg,a,-5.02,y,z));   // housing, cut open to show the rotors
  for(const x of[-4.8,-5.24])g.add(torus(.36,.03,'x',MAT.dark(),x,y,z));
  const r=new THREE.Group();r.position.set(-5.02,y,z);A.tcHub=r;g.add(r);const rm=MAT.bronze();
  r.add(cyl(.3,.3,.08,'x',rm,0.12,0,0,32));r.add(cyl(.3,.3,.08,'x',rm,-0.12,0,0,32));r.add(cyl(.08,.08,.5,'x',MAT.steel(),0,0,0,16));
  for(let k=0;k<10;k++){const t=k/10*Math.PI*2;for(const x of[-0.06,0.06]){const v=box(.04,.22,.02,rm,x,0.17*Math.cos(t),0.17*Math.sin(t));v.rotation.x=t;r.add(v);}}};
B.exhaustOutlet=g=>{const m=MAT.steel();g.add(tube([[-2.08,2.4,2.3],[-1.6,2.45,2.45],[-1.2,2.2,3.0],[-1.1,1.2,3.25],[-1.1,-0.6,3.25]],.3,m,48));g.add(torus(.36,.05,'x',MAT.dark(),-2.1,2.4,2.3));};
B.egrValve=g=>{const b=MAT.black(),s=MAT.steel();
  g.add(tube([[1.9,5.25,1.9],[1.9,5.45,1.98]],.12,s,8));
  g.add(rbox(.5,.5,.5,.06,MAT.hot(),1.9,5.7,2.0));g.add(rbox(.42,.3,.42,.06,b,1.9,6.08,2.0));g.add(box(.18,.1,.22,MAT.plastic(),1.9,6.28,2.0));   // valve body + actuator
  g.add(tube([[2.15,5.75,2.02],[2.25,5.95,2.05],[2.3,6.25,2.05],[2.45,6.3,2.05]],.13,s,24));};
B.egrCooler=g=>{const m=MAT.steel();g.add(cyl(.32,.32,2.6,'x',m,3.7,6.3,2.05));for(const x of[2.45,4.95])g.add(cyl(.36,.36,.25,'x',MAT.dark(),x,6.3,2.05));
  for(let k=0;k<4;k++)g.add(torus(.33,.015,'x',MAT.dark(),2.9+k*0.6,6.3,2.05));
  g.add(tube([[4.7,6.6,2.05],[4.9,6.95,1.6],[5.2,6.4,0.4],[5.45,5.6,-0.6]],.06,MAT.rubber(),40));                         // coolant to the thermostat housing
  g.add(tube([[2.7,6.0,2.05],[2.8,5.5,1.75],[3.2,4.2,1.35]],.06,MAT.rubber(),30));};                                     // coolant feed from the block
B.egrTube=g=>{const pts=[[5.05,6.3,2.05],[5.5,6.4,1.6],[5.75,6.85,0.6],[5.75,6.85,-0.6],[5.55,6.4,-1.4],[5.2,5.98,-1.6],[5.0,5.88,-1.6]];
  g.add(tube(pts,.17,MAT.steel(),80));const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  for(const u of[0.16,0.19,0.8,0.83]){const p=c.getPointAt(u),t=c.getTangentAt(u);const r=torus(.19,.035,'z',MAT.dark(),p.x,p.y,p.z);r.lookAt(p.clone().add(t));g.add(r);}
  for(const z of[0.35,-0.35])g.add(torus(.19,.04,'z',MAT.dark(),5.75,6.85,z));                                            // venturi section flanges
  g.add(rbox(.3,.22,.34,.04,MAT.black(),5.75,7.22,0));for(const z of[0.25,-0.25])g.add(tube([[5.75,7.0,z],[5.75,7.12,z*0.6]],.02,MAT.rubber(),6));};  // delta-P sensor and its two taps
B.waterPump=g=>{const a=MAT.alu();a.side=THREE.DoubleSide;
  g.add(mesh(voluteGeo(.24,.31,.05,.15,0.3),a,5.9,2.3,-0.9));g.add(cyl(.3,.3,.22,'x',a,5.86,2.3,-0.9));g.add(cyl(.14,.16,.25,'x',a,6.08,2.3,-0.9));
  g.add(tube([[5.9,2.0,-1.25],[5.9,1.7,-1.55],[6.05,1.35,-1.75]],.12,MAT.rubber(),16));
  const w=new THREE.Group();w.position.set(6.25,2.3,-0.9);A.wp=w;g.add(w);
  w.add(latheX([[0.12,-0.08],[0.32,-0.08],[0.36,-0.04],[0.33,0],[0.36,0.04],[0.32,0.08],[0.12,0.08]],MAT.steel(),0,0,0,40));for(let k=0;k<4;k++){const a=k/4*Math.PI*2;w.add(cyl(.05,.05,.04,'x',MAT.dark(),0.09,0.2*Math.cos(a),0.2*Math.sin(a),8));}};
B.thermostat=g=>{const m=grey();g.add(cyl(.3,.3,.5,'y',m,5.45,5.25,-0.85));g.add(cyl(.2,.2,.9,'x',m,5.9,5.3,-0.85));g.add(torus(.22,.03,'x',MAT.dark(),6.25,5.3,-0.85));};
B.coolantSensor=g=>{g.add(cyl(.06,.06,.25,'y',MAT.black(),5.45,5.6,-0.6,12));};
B.oilPump=g=>{const m=MAT.iron();g.add(box(.8,.45,.9,m,4.0,-1.45,0.1));g.add(tube([[4.0,-1.65,0.3],[4.0,-2.2,0.4],[3.6,-2.62,0.3]],.08,MAT.steel(),24));g.add(cyl(.32,.32,.06,'y',MAT.dark(),3.6,-2.72,0.3,24));};
B.oilCooler=g=>{const m=grey(),hw=MAT.zinc();g.add(rbox(3.2,.6,.22,.05,m,1.8,1.25,-1.62));for(let k=0;k<9;k++)g.add(box(.04,.44,.04,m,0.6+k*0.3,1.25,-1.75));
  for(const x of[0.3,3.3])for(const y of[1.05,1.45])hex(g,x,y,-1.76,'z',.05,hw);};
B.oilFilter=g=>{const a=MAT.alu(),z=-2.1;g.add(rbox(.7,.22,.7,.05,a,1.4,0.3,z));g.add(cyl(.3,.3,1.1,'y',a,1.4,0.95,z,36));
  for(const y of[0.6,1.2])g.add(torus(.305,.02,'y',MAT.dark(),1.4,y,z));g.add(cyl(.26,.26,.14,'y',MAT.black(),1.4,1.56,z,8));g.add(cyl(.09,.09,.1,'y',MAT.black(),1.4,1.68,z,6));
  g.add(box(.3,.15,.3,a,1.4,0.6,-1.85));};
B.oilSensor=g=>{g.add(cyl(.07,.07,.22,'z',MAT.black(),1.95,0.78,-1.85,12));};
const FAN_BLADE=(()=>{const U=12,V=8,pos=[],idx=[];
  for(let i=0;i<=U;i++){const u=i/U,r=0.55+u*1.45,w=0.32+0.24*u,tw=0.9-0.5*u,sw=0.28*u*u;
    for(let j=0;j<=V;j++){const v=j/V-0.5,cam=0.05*(1-4*v*v),cz=v*w+sw;pos.push(cam*Math.cos(tw)+cz*Math.sin(tw),r,-cam*Math.sin(tw)+cz*Math.cos(tw));}}
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;})();
B.fan=g=>{const d=MAT.dark();g.add(cyl(.42,.42,.55,'x',d,6.3,3.6,0));g.add(box(.3,.6,.6,grey(),5.88,3.6,0));
  const f=new THREE.Group();f.position.set(6.75,3.6,0);A.fan=f;g.add(f);const bm=MAT.plastic();bm.side=THREE.DoubleSide;
  f.add(latheX([[0.001,-0.12],[0.56,-0.12],[0.6,-0.06],[0.6,0.08],[0.4,0.14],[0.001,0.16]],bm,0,0,0,48));
  for(let k=0;k<10;k++){const b=mesh(FAN_BLADE,bm);b.rotation.x=k/10*Math.PI*2;f.add(b);}
  const fp=new THREE.Group();fp.position.set(6.25,3.6,0);A.fanP=fp;g.add(fp);fp.add(cyl(.48,.48,.16,'x',MAT.steel(),0,0,0,36));};
B.alternator=g=>{const a=MAT.alu(),d=MAT.black(),hw=MAT.zinc(),y=1.0,z=1.95;
  g.add(latheX([[0.15,0],[0.38,0],[0.42,0.05],[0.42,0.55],[0.44,0.57],[0.44,1.05],[0.4,1.12],[0.15,1.12]],a,4.66,y,z,48));
  for(const[x0,n]of[[4.9,12],[5.5,12]])for(let k=0;k<n;k++){const t=(k+0.5)/n*Math.PI*2,b=box(.26,.05,.05,d,x0,y+0.43*Math.cos(t),z+0.43*Math.sin(t));b.rotation.x=t;g.add(b);}
  for(let k=0;k<4;k++){const t=k/4*Math.PI*2+0.4;g.add(cyl(.025,.025,1.15,'x',MAT.steel(),5.22,y+0.45*Math.cos(t),z+0.45*Math.sin(t),8));}
  g.add(box(.22,.25,.16,a,4.85,y+0.5,z));g.add(box(.22,.25,.16,a,5.6,y-0.5,z));hex(g,4.85,y+0.58,z,'z',.06,hw);
  g.add(cyl(.05,.05,.16,'x',MAT.bronze(),4.58,y+0.18,z,8));hex(g,4.6,y+0.18,z,'x',.06,hw);
  const p=new THREE.Group();p.position.set(6.25,y,z);A.alt=p;g.add(p);const st=MAT.steel();
  const pv=[[0.05,-0.09],[0.2,-0.09],[0.27,-0.07]];for(let k=0;k<4;k++)pv.push([0.23,-0.05+k*0.035],[0.27,-0.035+k*0.035]);pv.push([0.27,0.09],[0.05,0.09]);p.add(latheX(pv,st,0,0,0,40));
  p.add(cyl(.05,.05,.55,'x',st,-0.32,0,0,12));hex(p,0.12,0,0,'x',.07,hw);
  for(let k=0;k<11;k++){const b=box(.06,.2,.02,a,-0.38,0.29*Math.cos(k/11*Math.PI*2),0.29*Math.sin(k/11*Math.PI*2));b.rotation.set(k/11*Math.PI*2,0.5,0);p.add(b);}};
B.belt=g=>{const cs=[[0,0,.81],[2.3,-0.9,.39],[3.6,0,.51],[1.0,1.95,.29],[1.05,-1.2,.28]];const hl=circlesHull(cs,64);
  const dense=[];for(let i=0;i<hl.length;i++){const a=hl[i],b=hl[(i+1)%hl.length];const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.08));for(let k=0;k<n;k++)dense.push([0,a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  const bm=tube(dense,.045,MAT.rubber(),dense.length*2,true);bm.scale.x=2.4;bm.position.x=6.25;g.add(bm);
  const t=new THREE.Group();t.position.set(6.25,1.05,-1.2);A.tens=t;g.add(t);t.add(cyl(.25,.25,.18,'x',MAT.steel(),0,0,0,24));
  beamYZ(g,[1.05,-1.2],[1.4,-0.6],.12,.14,MAT.dark()).position.x=6.0;g.add(cyl(.18,.18,.25,'x',MAT.dark(),5.95,1.4,-0.6));};
B.airCompressor=g=>{const a=MAT.alu(),d=MAT.dark(),hw=MAT.zinc(),y=3.6,z=-2.1;
  g.add(latheX([[0.2,0],[0.5,0],[0.5,0.1],[0.42,0.13],[0.42,1.3],[0.3,1.36],[0.2,1.36]],d,-5.25,y,z,48));                 // crankcase on the gear case
  for(let k=0;k<6;k++){const t=k/6*Math.PI*2;hex(g,-5.16,y+0.44*Math.cos(t),z+0.44*Math.sin(t),'x',.05,hw);}
  g.add(cyl(.26,.28,.5,'y',d,-4.45,4.15,z-0.15,32));for(let k=0;k<6;k++)g.add(cyl(.36,.36,.022,'y',d,-4.45,3.98+k*0.07,z-0.15,32));   // finned barrel
  g.add(rbox(.6,.22,.6,.06,a,-4.45,4.5,z-0.15));for(const dx of[-0.2,0.2])for(const dz of[-0.2,0.2])hex(g,-4.45+dx,4.64,z-0.15+dz,'y',.05,hw);   // head
  g.add(tube([[-4.45,4.5,-2.6],[-4.2,4.3,-2.9],[-3.4,3.0,-2.9],[-3.0,1.5,-2.7]],.06,MAT.steel(),40));};                   // discharge line
B.starter=g=>{const d=MAT.black(),k=MAT.dark(),hw=MAT.zinc(),y=0.05,z=1.95,o=-0.4;
  g.add(cyl(.36,.36,1.15,'x',d,-4.22+o,y,z,40));
  const dome=new THREE.SphereGeometry(.36,32,12,0,Math.PI*2,0,Math.PI/2);dome.rotateZ(-Math.PI/2);g.add(mesh(dome,d,-3.645+o,y,z));
  g.add(cyl(.3,.37,.4,'x',k,-5.0+o,y,z,40));g.add(rbox(.08,.95,.95,.12,k,-5.22+o,y,z));for(const t of[0.5,2.6,4.7])hex(g,-5.28+o,y+0.4*Math.cos(t),z+0.4*Math.sin(t),'x',.06,hw);
  g.add(cyl(.25,.25,.3,'x',k,-5.4+o,y,z));
  g.add(cyl(.19,.19,.8,'x',d,-4.55+o,y+0.55,z,32));g.add(cyl(.2,.2,.06,'x',k,-4.12+o,y+0.55,z,32));
  for(const dz of[-0.08,0.08]){g.add(cyl(.035,.035,.14,'x',MAT.bronze(),-4.03+o,y+0.6,z+dz,8));hex(g,-4.0+o,y+0.6,z+dz,'x',.045,hw);}
  for(let j=0;j<2;j++){const t=j*Math.PI+0.8;g.add(cyl(.02,.02,1.2,'x',MAT.steel(),-4.22+o,y+0.37*Math.cos(t),z+0.37*Math.sin(t),6));}};
B.crankSensor=g=>{g.add(cyl(.07,.07,.35,'y',MAT.black(),-6.0,2.65,0.6,12));g.add(box(.12,.1,.16,MAT.plastic(),-6.0,2.86,0.6));};
B.camSensor=g=>{g.add(cyl(.07,.07,.3,'y',MAT.black(),-5.43,7.05,0.9,12));g.add(box(.12,.14,.16,MAT.plastic(),-5.43,7.26,0.9));};
B.railSensor=g=>{g.add(cyl(.07,.07,.3,'x',MAT.black(),-4.62,3.9,-1.45,12));g.add(box(.12,.14,.14,MAT.plastic(),-4.82,3.9,-1.45));};
return B;
}
