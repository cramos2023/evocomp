/**
 * EvoComp Merit Review – Matrix Acceptance Tests
 * Run: node scripts/verify_merit_matrix.js
 * All 8 required acceptance cases from the spec.
 */

function buildMeritMatrix(stepFactor) {
  const cap = 1.0;
  const fe = { BELOW_MIN: cap+4*stepFactor, BELOW_MID: cap+3*stepFactor, ABOVE_MID: cap+2*stepFactor, ABOVE_MAX: cap };
  const sub = (b, o) => Math.max(0, Math.round((b-o)*1e10)/1e10);
  return {
    FE: fe,
    E:  { BELOW_MIN: sub(fe.BELOW_MIN,stepFactor),   BELOW_MID: sub(fe.BELOW_MID,stepFactor),   ABOVE_MID: sub(fe.ABOVE_MID,stepFactor),   ABOVE_MAX: fe.ABOVE_MAX },
    FM: { BELOW_MIN: sub(fe.BELOW_MIN,2*stepFactor), BELOW_MID: sub(fe.BELOW_MID,2*stepFactor), ABOVE_MID: sub(fe.ABOVE_MID,2*stepFactor), ABOVE_MAX: sub(fe.ABOVE_MAX,2*stepFactor) },
    PM:  { BELOW_MIN:0, BELOW_MID:0, ABOVE_MID:0, ABOVE_MAX:0 },
    DNM: { BELOW_MIN:0, BELOW_MID:0, ABOVE_MID:0, ABOVE_MAX:0 },
  };
}
function getZone(cr, t1, t2, t3) { if(cr<t1) return 'BELOW_MIN'; if(cr<t2) return 'BELOW_MID'; if(cr<t3) return 'ABOVE_MID'; return 'ABOVE_MAX'; }
const BUDGET=0.20, SF=0.50, T1=0.75, T2=1.00, T3=1.25;
const m = buildMeritMatrix(SF);
let pass=0, fail=0;
function check(label, actual, expected) {
  const ok = Math.abs(actual-expected)<0.0001;
  console.log(`${ok?'✓':'✗'} ${label}: ${(actual*100).toFixed(1)}% (expected ${(expected*100).toFixed(0)}%)`);
  if(ok) pass++; else fail++;
}
check('FE compa=0.70 (BELOW_MIN) → 60%', BUDGET*(m.FE[getZone(0.70,T1,T2,T3)]??0), 0.60);
check('FE compa=0.90 (BELOW_MID) → 50%', BUDGET*(m.FE[getZone(0.90,T1,T2,T3)]??0), 0.50);
check('FE compa=1.10 (ABOVE_MID) → 40%', BUDGET*(m.FE[getZone(1.10,T1,T2,T3)]??0), 0.40);
check('FE compa=1.30 (ABOVE_MAX) → 20%', BUDGET*(m.FE[getZone(1.30,T1,T2,T3)]??0), 0.20);
check('E  compa=1.10 (ABOVE_MID) → 30%', BUDGET*(m.E[getZone(1.10,T1,T2,T3)]??0),  0.30);
check('FM compa=1.30 (ABOVE_MAX) →  0%', BUDGET*(m.FM[getZone(1.30,T1,T2,T3)]??0), 0.00);
check('PM compa=0.70             →  0%', BUDGET*(m.PM[getZone(0.70,T1,T2,T3)]??0), 0.00);
check('DNM any                   →  0%', BUDGET*(m.DNM[getZone(1.10,T1,T2,T3)]??0), 0.00);
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail>0){console.error('FAIL'); process.exit(1);} else console.log('ALL PASS');
