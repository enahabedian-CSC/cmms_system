// CSC CMMS - Shared data
window.CSC_DATA = (() => {
  const MANAGERS = [
    { id: 'izzy', name: 'Izzy Zuniga', email: 'izuniga@cscmfg.com', depts: ['PLASTICS', 'ELECTRICAL'], role: 'Plastics Lead · Electrical Reroutes', initials: 'IZ', team: ['Jesus Nunez','Ismael Silva','Felipe Vasquez','Steven Zuniga'] },
    { id: 'mike', name: 'Mike Magallanes', email: 'mmagallanes@cscmfg.com', depts: ['MACHINE SHOP', 'FACILITIES'], role: 'Machine Shop · Facilities', initials: 'MM', team: ['Anthony Gonzalez','Christian Gavina','Jorge Guzman','David Avila'] },
    { id: 'eddie', name: 'Eddie Nahabedian', email: 'enahabedian@cscmfg.com', depts: ['METALS'], role: 'Metals Lead', initials: 'EN', team: ['Art Ramos','Art Ramos Jr.','Justino Flores'] },
    { id: 'dillon', name: 'Dillon Hutchinson', email: 'dhutchinson@cscmfg.com', depts: ['EQUIPMENT TAGGING'], role: 'Equipment Tagging', initials: 'DH', team: ['Danny Zubia'] },
    { id: 'christopher', name: 'Christopher Dewaik', email: 'cdewaik@cscmfg.com', depts: ['LITHO'], role: 'Litho', initials: 'CD', team: ['Efren Becerra','Giovanni Hernandez'] },
    { id: 'jaime', name: 'Jaime Magdaleno', email: 'jmagdaleno@cscmfg.com', depts: ['LITHO'], role: 'Litho · Decorating', initials: 'JM', team: ['Martin Ventura','John Messina'] },
    { id: 'joel', name: 'Joel Gonzalez', email: 'jgonzalez@cscmfg.com', depts: ['METALS'], role: 'Metals · Slitter Line', initials: 'JG', team: ['Jorge Juarez','Alfonso Melchor'] },
    { id: 'alex', name: 'Alex Baltazar', email: 'abaltazar@cscmfg.com', depts: ['FACILITIES'], role: 'Facilities · Building Ops', initials: 'AB', team: ['Felipe Vasquez'] },
    { id: 'arnel', name: 'Arnel Nagel', email: 'anagel@cscmfg.com', depts: ['METALS'], role: 'Metals · QA Liaison', initials: 'AN', team: ['Art Ramos Jr.'] },
  ];

  const TICKETS = [
    { id:'MT-004-260507-002', status:'PENDING PARTS', priority:'MEDIUM', dept:'LITHO', deptTrail:['LITHO'], equipment:'EQUIPMENT--LITHO VACUUM PUMP', code:'004-906', building:'B1', zone:'Z4 Lithography', problemType:'Wear & Tear', desc:'Vacuum generators need replacement, 2 EOAT down. Replacement vacuum generators sourced through Festo, awaiting arrival.', assigned:'Jesus Nunez', assignedInit:'JN', submitted:'2026-05-07 06:42', age:'2d 8h', estHrs:4, actualHrs:1.5, downtime:'UNPLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'christopher' },
    { id:'MT-008-260507-001', status:'OPEN', priority:'LOW', dept:'M/S', deptTrail:['M/S'], equipment:'EQUIPMENT--CHILLER TANK/PUMPS', code:'008-916', building:'B1', zone:'Z5 Misc', problemType:'Facility', desc:'Low water flow on Line-8 chiller. Bypass valve installed as temporary fix while replacement diaphragm pump is sourced.', assigned:'Mike Magallanes', assignedInit:'MM', submitted:'2026-05-07 14:12', age:'2d', estHrs:6, actualHrs:2.5, downtime:'PLANNED', fixType:'Temporary', tagColor:'orange', tempFix:true, source:'Internal', mgr:'mike' },
    { id:'MT-003-260506-002', status:'COMPLETE', priority:'MEDIUM', dept:'METAL', deptTrail:['METAL'], equipment:'MOLD, #48-D, 4.25 GAL ROUND', code:'003-353', building:'B1', zone:'Z2 Metals', problemType:'Mechanical Failure', desc:'Leader pins fabricated and installed. Mold returned to service after dimensional check.', assigned:'Art Ramos', assignedInit:'AR', submitted:'2026-05-06 08:15', age:'3d 14h', estHrs:8, actualHrs:9.25, downtime:'UNPLANNED', fixType:'Permanent', tagColor:'green', tempFix:false, source:'Internal', mgr:'eddie' },
    { id:'MT-001-260506-001', status:'OPEN', priority:'MEDIUM', dept:'M/S', deptTrail:['M/S'], equipment:'PRESS NO. 18', code:'001-018', building:'B1', zone:'Z2 Metals', problemType:'Electrical Issue', desc:'VFD generating excess heat, enclosure not dissipating. Suspecting failed cooling fan; thermal imaging logged 84°C at heatsink.', assigned:'Anthony Gonzalez', assignedInit:'AG', submitted:'2026-05-06 11:02', age:'3d 11h', estHrs:3, actualHrs:1, downtime:'UNPLANNED', fixType:'Permanent', tagColor:'yellow', tempFix:false, source:'Internal', mgr:'mike' },
    { id:'MT-031-260508-001', status:'OPEN', priority:'HIGH', dept:'ELECTRICAL', deptTrail:['G&A','ELECTRICAL'], equipment:'BUILDINGS--CSC--ALL', code:'008-1001', building:'B1', zone:'Z5 Misc', problemType:'Facility', desc:"A/C in David's office not blowing cold. Compressor cycling on/off; refrigerant pressure low at sight glass.", assigned:'Anthony Gonzalez', assignedInit:'AG', submitted:'2026-05-08 09:30', age:'1d 5h', estHrs:2, actualHrs:0, downtime:'UNPLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'External', mgr:'izzy' },
    { id:'MT-030-260506-001', status:'CLOSED', priority:'CRITICAL', dept:'MACHINE SHOP', deptTrail:['MACHINE SHOP'], equipment:'SHIPPING--TRUCK NO. 1', code:'009-611', building:'B1', zone:'Z1 Shipping & Receiving', problemType:'Preventive Maintenance', desc:'Drill bit inspection on truck-mounted vise. PM completed; no follow-up required.', assigned:'Christian Gavina', assignedInit:'CG', submitted:'2026-05-06 06:50', age:'closed', estHrs:1, actualHrs:0.75, downtime:'PLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'mike', closedBy:'Mike Magallanes', closedDate:'2026-05-06 11:14' },
    { id:'MT-001-260505-002', status:'OPEN', priority:'LOW', dept:'METAL', deptTrail:['METAL'], equipment:'SLITTER', code:'001-204', building:'B1', zone:'Z2 Metals', problemType:'Wear & Tear', desc:'Need 30 orange rotating wheels for slitter cassette refresh. Awaiting parts requisition signoff.', assigned:'Unassigned', assignedInit:'??', submitted:'2026-05-05 15:20', age:'4d 2h', estHrs:2, actualHrs:0, downtime:'PLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'eddie' },
    { id:'MT-003-260508-003', status:'WAITING', priority:'HIGH', dept:'PLASTICS', deptTrail:['PLASTICS'], equipment:'INJECTION PRESS NO. 6', code:'003-106', building:'B2', zone:'Z3 Plastics', problemType:'Hydraulic', desc:'Hydraulic line weeping at clamp manifold. Press still cycling; volume drop noted on reservoir.', assigned:'Unassigned', assignedInit:'??', submitted:'2026-05-08 13:55', age:'1d 1h', estHrs:6, actualHrs:0, downtime:'UNPLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'External', mgr:'izzy' },
    { id:'MT-006-260508-002', status:'WAITING', priority:'MEDIUM', dept:'PLASTICS', deptTrail:['PLASTICS'], equipment:'IML LABEL FEEDER', code:'006-441', building:'B2', zone:'Z3 Plastics', problemType:'Pneumatic', desc:'Label transfer arm misfeeding ~1 in 30 cycles. Vacuum cup wear suspected.', assigned:'Unassigned', assignedInit:'??', submitted:'2026-05-08 10:12', age:'1d 4h', estHrs:3, actualHrs:0, downtime:'PLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'izzy' },
    { id:'MT-008-260508-001', status:'OPEN', priority:'MEDIUM', dept:'MACHINE SHOP', deptTrail:['MACHINE SHOP'], equipment:'AIR COMPRESSOR NO. 2', code:'008-202', building:'B1', zone:'Z5 Misc', problemType:'Mechanical Failure', desc:'Compressor short-cycling. Belts checked OK; pressure switch reading 110psi cut-out vs 145 spec.', assigned:'Christian Gavina', assignedInit:'CG', submitted:'2026-05-08 07:45', age:'1d 7h', estHrs:4, actualHrs:1.25, downtime:'UNPLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'mike' },
    { id:'MT-003-260507-004', status:'PENDING PARTS', priority:'MEDIUM', dept:'PLASTICS', deptTrail:['PLASTICS'], equipment:'MOLD, #48-E, 4.25 GAL ROUND', code:'003-354', building:'B2', zone:'Z3 Plastics', problemType:'Wear & Tear', desc:'Ejector pins worn beyond spec. New pins on order from Husky.', assigned:'Felipe Vasquez', assignedInit:'FV', submitted:'2026-05-07 09:20', age:'2d 6h', estHrs:5, actualHrs:2, downtime:'UNPLANNED', fixType:'Permanent', tagColor:'yellow', tempFix:false, source:'Internal', mgr:'izzy' },
    { id:'MT-003-260505-001', status:'OPEN', priority:'CRITICAL', dept:'PLASTICS', deptTrail:['PLASTICS'], equipment:'BLENDER NO. 3', code:'003-503', building:'B2', zone:'Z3 Plastics', problemType:'Controls / PLC', desc:'PLC fault E-441 on auxiliary blender. Material loading halted; line cycling on backup blender.', assigned:'Ismael Silva', assignedInit:'IS', submitted:'2026-05-05 06:15', age:'4d 9h', estHrs:8, actualHrs:5.5, downtime:'UNPLANNED', fixType:'Permanent', tagColor:'red', tempFix:false, source:'Internal', mgr:'izzy' },
    { id:'MT-004-260504-002', status:'ON HOLD', priority:'LOW', dept:'LITHO', deptTrail:['LITHO'], equipment:'OVEN NO. 4', code:'004-704', building:'B3', zone:'Z4 Lithography', problemType:'Facility', desc:'Burner won\'t hold flame above 380°F. On hold pending production schedule clearance.', assigned:'Efren Becerra', assignedInit:'EB', submitted:'2026-05-04 12:00', age:'5d 5h', estHrs:6, actualHrs:1.5, downtime:'PLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'christopher' },
    { id:'MT-008-260505-001', status:'COMPLETE', priority:'MEDIUM', dept:'MACHINE SHOP', deptTrail:['MACHINE SHOP'], equipment:'FORKLIFT NO. 7', code:'008-707', building:'B1', zone:'Z1 Shipping & Receiving', problemType:'Preventive Maintenance', desc:'500hr PM complete. Hydraulic fluid changed, filters replaced. Awaiting Mike verification.', assigned:'Jorge Guzman', assignedInit:'JG', submitted:'2026-05-05 08:00', age:'4d', estHrs:3, actualHrs:2.75, downtime:'PLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'mike' },
    { id:'MT-007-260505-001', status:'WAITING', priority:'CRITICAL', dept:'METAL', deptTrail:['QA','METAL'], equipment:'SEAMER NO. 2', code:'001-302', building:'B1', zone:'Z2 Metals', problemType:'Mechanical Failure', desc:'QA holding production lot 26050501 — seam thickness drift. Suspected chuck worn. Critical: bypasses waiting queue.', assigned:'Justino Flores', assignedInit:'JF', submitted:'2026-05-05 14:30', age:'3d 23h', estHrs:6, actualHrs:0, downtime:'UNPLANNED', fixType:'Permanent', tagColor:'red', tempFix:false, source:'External', mgr:'eddie' },
    { id:'MT-001-260503-002', status:'CLOSED', priority:'HIGH', dept:'METAL', deptTrail:['METAL'], equipment:'PRESS NO. 11', code:'001-011', building:'B1', zone:'Z2 Metals', problemType:'Electrical Issue', desc:'Servo drive replaced. Verified operation across full press cycle. Ready for production.', assigned:'Art Ramos Jr.', assignedInit:'AJ', submitted:'2026-05-03 07:30', age:'closed', estHrs:8, actualHrs:7.5, downtime:'UNPLANNED', fixType:'Permanent', tagColor:null, tempFix:false, source:'Internal', mgr:'eddie', closedBy:'Eddie Nahabedian', closedDate:'2026-05-04 10:30' },
  ];

  const PARTS = [
    { id:'PRT-2026-0214', desc:'Festo Vacuum Generator VAD-M5', stage:'ORDERED', ticket:'MT-004-260507-002', equipment:'LITHO VACUUM PUMP (004-906)', dept:'LITHO', days:2, vendor:'Festo USA', notify:true },
    { id:'PRT-2026-0215', desc:'Husky Ejector Pin Set, 48-E', stage:'BACKORDERED', ticket:'MT-003-260507-004', equipment:'MOLD #48-E (003-354)', dept:'PLASTICS', days:6, vendor:'Husky Injection', notify:true },
    { id:'PRT-2026-0216', desc:'Slitter Wheel, Orange, ø2.5"', stage:'REQUESTED', ticket:'MT-001-260505-002', equipment:'SLITTER (001-204)', dept:'METAL', days:4, vendor:'—', notify:true },
    { id:'PRT-2026-0217', desc:'Diaphragm Pump, ¾" NPT', stage:'ON HOLD FOR APPROVAL', ticket:'MT-008-260507-001', equipment:'CHILLER TANK (008-916)', dept:'MACHINE SHOP', days:1, vendor:'Grainger', notify:true },
    { id:'PRT-2026-0218', desc:'VFD Cooling Fan, 120mm', stage:'RECEIVED', ticket:'MT-001-260506-001', equipment:'PRESS NO. 18 (001-018)', dept:'MACHINE SHOP', days:0, vendor:'Allied Electronics', notify:true },
    { id:'PRT-2026-0219', desc:'Servo Drive, 7.5kW', stage:'USED', ticket:'MT-001-260503-002', equipment:'PRESS NO. 11 (001-011)', dept:'METAL', days:0, vendor:'Yaskawa', notify:false },
    { id:'PRT-2026-0220', desc:'IML Vacuum Cup, ø32mm (qty 12)', stage:'REQUESTED', ticket:'MT-006-260508-002', equipment:'IML LABEL FEEDER (006-441)', dept:'PLASTICS', days:1, vendor:'—', notify:true },
    { id:'PRT-2026-0221', desc:'R-410A Refrigerant, 25lb', stage:'ORDERED', ticket:'MT-031-260508-001', equipment:'BUILDINGS--CSC--ALL', dept:'ELECTRICAL', days:1, vendor:'Johnstone', notify:true },
    { id:'PRT-2026-0222', desc:'PLC Module, Allen-Bradley 1756-IB16', stage:'ORDERED', ticket:'MT-003-260505-001', equipment:'BLENDER NO. 3 (003-503)', dept:'PLASTICS', days:3, vendor:'Rockwell', notify:true },
    { id:'PRT-2026-0223', desc:'Pressure Switch, 145psi', stage:'RECEIVED', ticket:'MT-008-260508-001', equipment:'AIR COMPRESSOR NO. 2', dept:'MACHINE SHOP', days:0, vendor:'Grainger', notify:false },
  ];

  const HOLD_TAGS = [
    { tagId:'TAG-2026-0048', equipment:'BLENDER NO. 3 (003-503)', color:'red', reason:'PLC fault E-441 — material loading offline', taggedBy:'Izzy Zuniga', date:'2026-05-05 06:30', cleared:false, ticket:'MT-003-260505-001' },
    { tagId:'TAG-2026-0049', equipment:'PRESS NO. 18 (001-018)', color:'yellow', reason:'VFD running hot — caution, monitored every 2hrs', taggedBy:'Mike Magallanes', date:'2026-05-06 11:30', cleared:false, ticket:'MT-001-260506-001' },
    { tagId:'TAG-2026-0050', equipment:'CHILLER TANK/PUMPS (008-916)', color:'orange', reason:'Bypass valve installed — temp fix in place', taggedBy:'Mike Magallanes', date:'2026-05-07 15:00', cleared:false, ticket:'MT-008-260507-001' },
    { tagId:'TAG-2026-0051', equipment:'SEAMER NO. 2 (001-302)', color:'red', reason:'QA hold — seam thickness drift', taggedBy:'Eddie Nahabedian', date:'2026-05-05 14:45', cleared:false, ticket:'MT-007-260505-001' },
    { tagId:'TAG-2026-0052', equipment:'MOLD #48-E (003-354)', color:'yellow', reason:'Ejector pins worn — caution, 4hr max runs', taggedBy:'Izzy Zuniga', date:'2026-05-07 10:00', cleared:false, ticket:'MT-003-260507-004' },
    { tagId:'TAG-2026-0046', equipment:'MOLD #48-D (003-353)', color:'green', reason:'Cleared by Eddie — pins replaced, dim. checked', taggedBy:'Eddie Nahabedian', date:'2026-05-06 16:00', cleared:true, ticket:'MT-003-260506-002' },
    { tagId:'TAG-2026-0045', equipment:'PRESS NO. 11 (001-011)', color:'green', reason:'Cleared — servo replaced, full-cycle verified', taggedBy:'Eddie Nahabedian', date:'2026-05-04 10:30', cleared:true, ticket:'MT-001-260503-002' },
  ];

  const TEMP_FIXES = [
    { id:'TF-2026-019', ticket:'MT-008-260507-001', equipment:'CHILLER TANK/PUMPS (008-916)', date:'2026-05-07', daysUntil:5, status:'Active', desc:'Bypass valve installed routing flow around failed diaphragm. Permanent: replace pump.', mgr:'Mike Magallanes' },
    { id:'TF-2026-018', ticket:'MT-002-260428-001', equipment:'CONVEYOR LINE-3 DRIVE', date:'2026-04-28', daysUntil:-3, status:'Past Due', desc:'Belt re-tensioned to bridge motor mount slip. Permanent: replace mount + bushings.', mgr:'Eddie Nahabedian' },
    { id:'TF-2026-017', ticket:'MT-004-260425-002', equipment:'OVEN NO. 4 BURNER (004-704)', date:'2026-04-25', daysUntil:-6, status:'Past Due', desc:'Manual ignition workaround active during prod runs. Permanent: replace ignition module.', mgr:'Christopher Dewaik' },
    { id:'TF-2026-016', ticket:'MT-001-260418-001', equipment:'PRESS NO. 9 PEDAL', date:'2026-04-18', daysUntil:9, status:'Active', desc:'Pedal lockout secondary added pending switch replacement.', mgr:'Eddie Nahabedian' },
  ];

  const TICKET_HISTORY = [
    { type:'created', label:'CREATED', ts:'2026-05-07 06:42', who:'External requester (Cathy Tran, Litho)', body:'Ticket auto-synced from external request form.', meta:'Source: [EXT] Sheet · FRM-030-001' },
    { type:'transferred', label:'TRANSFERRED', ts:'2026-05-07 07:18', who:'Christopher Dewaik', body:'Department reset from G&A → LITHO based on equipment classification (004-906).', meta:'Notify: izuniga@cscmfg.com, jnunez@cscmfg.com' },
    { type:'assigned', label:'ASSIGNED', ts:'2026-05-07 07:21', who:'Christopher Dewaik', body:'Assigned to Jesus Nunez. Estimated hours: 4.', meta:'' },
    { type:'tempfix', label:'TEMP FIX FLAGGED', ts:'2026-05-07 09:50', who:'Jesus Nunez', body:'Disabled the 2 affected EOAT cups, ran on 4 cups at reduced rate. Inspection due in 7 days.', meta:'Linked: TF-2026-020 · Maint. Program 030' },
    { type:'tagged', label:'EQUIPMENT TAGGED', ts:'2026-05-07 09:55', who:'Jesus Nunez', body:'Yellow tag issued — Use With Caution. Reduced cycle rate posted at machine.', meta:'Tag: TAG-2026-0047 · FRM-029-001' },
    { type:'parts', label:'PARTS REQUESTED', ts:'2026-05-07 10:12', who:'Jesus Nunez', body:'Requested 4× Festo Vacuum Generator VAD-M5. Vendor: Festo USA. ETA pending.', meta:'PRT-2026-0214' },
    { type:'parts', label:'PARTS ORDERED', ts:'2026-05-07 14:30', who:'Christopher Dewaik', body:'PO #PO-2026-1188 issued. ETA 2026-05-12.', meta:'Notify on receipt: jnunez@cscmfg.com' },
  ];

  const REC_EQUIP = [
    { name:'MOLD #48-E (003-354)', dept:'PLASTICS', count:6, avg:2.4, last:'2026-05-07', chronic:true },
    { name:'BLENDER NO. 3 (003-503)', dept:'PLASTICS', count:5, avg:3.1, last:'2026-05-05', chronic:true },
    { name:'OVEN NO. 4 (004-704)', dept:'LITHO', count:4, avg:1.8, last:'2026-05-04', chronic:true },
    { name:'PRESS NO. 18 (001-018)', dept:'MACHINE SHOP', count:3, avg:2.1, last:'2026-05-06', chronic:true },
    { name:'CHILLER TANK (008-916)', dept:'MACHINE SHOP', count:3, avg:1.5, last:'2026-05-07', chronic:true },
    { name:'IML LABEL FEEDER (006-441)', dept:'PLASTICS', count:2, avg:1.2, last:'2026-05-08', chronic:false },
    { name:'SLITTER (001-204)', dept:'METAL', count:2, avg:0.8, last:'2026-05-05', chronic:false },
    { name:'FORKLIFT NO. 7 (008-707)', dept:'MACHINE SHOP', count:2, avg:1.6, last:'2026-05-05', chronic:false },
  ];

  const TECH_PERF = [
    { name:'Anthony Gonzalez', assigned:8, completed:6, closed:5, hrs:32, avg:4.1, time:1.8, pass:96 },
    { name:'Christian Gavina', assigned:6, completed:5, closed:5, hrs:28, avg:4.7, time:1.4, pass:100 },
    { name:'Art Ramos', assigned:5, completed:4, closed:4, hrs:24, avg:5.5, time:2.0, pass:95 },
    { name:'Jesus Nunez', assigned:7, completed:5, closed:4, hrs:30, avg:4.4, time:2.2, pass:92 },
    { name:'Ismael Silva', assigned:4, completed:3, closed:3, hrs:18, avg:4.6, time:1.9, pass:100 },
    { name:'Felipe Vasquez', assigned:5, completed:4, closed:3, hrs:21, avg:4.3, time:2.1, pass:90 },
    { name:'Justino Flores', assigned:3, completed:2, closed:2, hrs:14, avg:5.1, time:2.4, pass:100 },
    { name:'Jorge Guzman', assigned:4, completed:3, closed:3, hrs:17, avg:4.4, time:1.7, pass:97 },
  ];

  const DEPT_COUNTS = {
    'MACHINE SHOP': { total: 18, open: 5, crit: 0, high: 1, parts: 2, hold: 1, complete: 2, waiting: 0 },
    'ELECTRICAL':   { total: 9,  open: 3, crit: 0, high: 1, parts: 1, hold: 0, complete: 1, waiting: 0 },
    'FACILITIES':   { total: 6,  open: 2, crit: 0, high: 0, parts: 0, hold: 1, complete: 1, waiting: 0 },
    'PLASTICS':     { total: 22, open: 6, crit: 1, high: 1, parts: 3, hold: 0, complete: 1, waiting: 2 },
    'METALS':       { total: 14, open: 4, crit: 1, high: 0, parts: 0, hold: 0, complete: 2, waiting: 1 },
    'LITHO':        { total: 5,  open: 2, crit: 0, high: 0, parts: 1, hold: 1, complete: 0, waiting: 0 },
  };

  return { MANAGERS, TICKETS, PARTS, HOLD_TAGS, TEMP_FIXES, TICKET_HISTORY, REC_EQUIP, TECH_PERF, DEPT_COUNTS };
})();
