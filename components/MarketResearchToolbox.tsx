"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const fmtNum = (x: number) => new Intl.NumberFormat().format(Math.round(x));
const zForCL = (cl: number) => ({ 90: 1.644854, 95: 1.959964, 99: 2.575829 } as Record<number, number>)[cl] || 1.959964;
function erf(x: number) { const s = x < 0 ? -1 : 1; const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; x = Math.abs(x); const t = 1 / (1 + p * x); const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x); return s * y; }
function zcdf(z: number) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

function Stat({ title, value, sub, highlight }: { title: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}`}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function GroupBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function LabeledNumber({ label, value, setValue, min, max, step = 1 }: { label: string; value: number; setValue: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={value} min={min} max={max} step={step} onChange={(e) => setValue(Number(e.target.value))} />
    </div>
  );
}

function SampleSizeCalculator() {
  const [population, setPopulation] = useState<number>(0);
  const [prop, setProp] = useState<number>(0.5);
  const [moePct, setMoePct] = useState<number>(5);
  const [conf, setConf] = useState<number>(95);
  const moe = moePct / 100;
  const { n, fpcApplied } = useMemo(() => {
    const Z = zForCL(conf);
    const p = clamp(prop, 0.0001, 0.9999);
    const e = clamp(moe, 0.0005, 0.5);
    const n0calc = (Z * Z * p * (1 - p)) / (e * e);
    if (population && population > 0) {
      const nAdj = n0calc / (1 + (n0calc - 1) / population);
      return { n: nAdj, fpcApplied: true };
    }
    return { n: n0calc, fpcApplied: false };
  }, [population, prop, moe, conf]);
  const recN = Math.ceil(n);
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-6 p-6">
        <h2 className="text-xl font-semibold">Sample Size Calculator (Proportion)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Population size</Label>
            <Input type="number" min={0} placeholder="0 = unknown / large" value={population} onChange={(e) => setPopulation(Number(e.target.value))} />
          </div>
          <div>
            <Label className="flex items-center gap-2">Expected proportion (p)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs cursor-help select-none">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The proportion you expect to observe in the population (e.g., expected % who answer “Yes”). Use 0.5 if unsure.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input type="number" step="0.01" min={0} max={1} value={prop} onChange={(e) => setProp(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Use 0.5 if unsure (most conservative).</p>
          </div>
          <div>
            <Label>Margin of error (±%)</Label>
            <Input type="number" step="0.1" min={0.1} max={50} value={moePct} onChange={(e) => setMoePct(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Enter as a percentage (e.g., 5 for ±5%).</p>
          </div>
          <div>
            <Label className="flex items-center gap-2">Confidence level
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs cursor-help select-none">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The probability that the interval contains the true value if you repeated the study many times (e.g., 95%).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <select className="w-full border rounded-md h-10 px-3" value={conf} onChange={(e) => setConf(Number(e.target.value))}>
              <option value={90}>90%</option>
              <option value={95}>95%</option>
              <option value={99}>99%</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Stat highlight title="Recommended n" value={fmtNum(recN)} sub={fpcApplied ? "Finite population corrected" : "Large population assumption"} />
          <Stat highlight title="Implied CI" value={`±${moePct}%`} sub={`${conf}% Confidence`} />
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="fml">
            <AccordionTrigger>Formulae</AccordionTrigger>
            <AccordionContent>
              <div className="text-sm leading-7">
                <p><strong>n₀</strong> = (Z² · p · (1−p)) / e²</p>
                <p><strong>FPC</strong>: n = n₀ / (1 + (n₀−1)/N)</p>
                <p>Where Z depends on confidence level, p is expected proportion, e is margin of error, N is population size.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function WeightingImpactVisualizer() {
  const [n, setN] = useState<number>(1000);
  const [rows, setRows] = useState<{ label: string; sample: number; target: number }[]>([
    { label: "18–34", sample: 30, target: 32 },
    { label: "35–54", sample: 40, target: 38 },
    { label: "55+", sample: 30, target: 30 }
  ]);
  const [showOutcome, setShowOutcome] = useState<boolean>(false);
  const [outcomes, setOutcomes] = useState<{ y: number }[]>([{ y: 55 }, { y: 62 }, { y: 48 }]);
  const totals = useMemo(() => {
    const sTot = rows.reduce((a, r) => a + (r.sample || 0), 0) || 1;
    const tTot = rows.reduce((a, r) => a + (r.target || 0), 0) || 1;
    const norm = rows.map((r, i) => {
      const s = (r.sample || 0) / sTot;
      const t = (r.target || 0) / tTot;
      const w = s > 0 ? t / s : 0;
      return { ...r, s, t, w, idx: i } as any;
    });
    const meanW = norm.reduce((a: number, r: any) => a + r.s * r.w, 0) || 1;
    const cv2 = norm.reduce((a: number, r: any) => a + r.s * Math.pow(r.w / meanW - 1, 2), 0);
    const deff = 1 + cv2;
    const neff = n / deff;
    const wMin = Math.min(...norm.map((r: any) => r.w));
    const wMax = Math.max(...norm.map((r: any) => r.w));
    let unweightedY: number | null = null;
    let weightedY: number | null = null;
    if (showOutcome) {
      const ys = outcomes.map((o) => clamp((o?.y || 0) / 100, 0, 1));
      unweightedY = norm.reduce((a: number, r: any, i: number) => a + r.s * ys[i], 0);
      weightedY = norm.reduce((a: number, r: any, i: number) => a + r.t * ys[i], 0);
    }
    return { norm, deff, neff, wMin, wMax, unweightedY, weightedY };
  }, [rows, n, showOutcome, outcomes]);
  const updateRow = (i: number, field: "label" | "sample" | "target", val: any) => {
    setRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  };
  const updateOutcome = (i: number, val: number) => setOutcomes((o) => o.map((r, idx) => (idx === i ? { y: val } : r)));
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-6 p-6">
        <h2 className="text-xl font-semibold">Weighting Impact Visualizer</h2>
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-1">
            <Label>Total interviews (n)</Label>
            <Input type="number" min={50} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </div>
          <div className="md:col-span-3">
            <Label>Segments</Label>
            <div className="grid grid-cols-12 gap-2 text-sm font-medium mt-2">
              <div className="col-span-4">Label</div>
              <div className="col-span-3">Sample %</div>
              <div className="col-span-3">Target %</div>
              <div className="col-span-2 text-right">Weight</div>
            </div>
            {totals.norm.map((r: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mt-1">
                <Input className="col-span-4" value={r.label} onChange={(e) => updateRow(i, "label", e.target.value)} />
                <Input className="col-span-3" type="number" step="0.1" value={rows[i].sample} onChange={(e) => updateRow(i, "sample", Number(e.target.value))} />
                <Input className="col-span-3" type="number" step="0.1" value={rows[i].target} onChange={(e) => updateRow(i, "target", Number(e.target.value))} />
                <div className="col-span-2 text-right text-sm">{r.w.toFixed(2)}×</div>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => { setRows((rs) => [...rs, { label: `Segment ${rs.length + 1}`, sample: 10, target: 10 }]); setOutcomes((o) => [...o, { y: 50 }]); }}>+ Add segment</Button>
              <Button variant="ghost" onClick={() => { setRows([{ label: "18–34", sample: 30, target: 32 }, { label: "35–54", sample: 40, target: 38 }, { label: "55+", sample: 30, target: 30 }]); setOutcomes([{ y: 55 }, { y: 62 }, { y: 48 }]); }}>Reset</Button>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4 mt-2">
          <Stat title="Design effect (weights)" value={totals.deff.toFixed(3)} sub="DEFF = 1 + CV(w)²" />
          <Stat title="Effective n" value={fmtNum(totals.neff)} sub="n_eff = n / DEFF" />
          <Stat title="Min weight" value={`${totals.wMin.toFixed(2)}×`} />
          <Stat title="Max weight" value={`${totals.wMax.toFixed(2)}×`} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Switch checked={showOutcome} onCheckedChange={setShowOutcome} id="showOutcome" />
          <Label htmlFor="showOutcome">Include an outcome by segment (optional)</Label>
        </div>
        {showOutcome && (
          <div className="mt-2">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium">
              <div className="col-span-4">Segment</div>
              <div className="col-span-4">Outcome % (segment)</div>
              <div className="col-span-4">—</div>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mt-1">
                <div className="col-span-4 text-sm">{r.label}</div>
                <Input className="col-span-4" type="number" step="0.1" value={outcomes[i]?.y ?? 0} onChange={(e) => updateOutcome(i, Number(e.target.value))} />
                <div className="col-span-4 text-xs text-muted-foreground">Used to show how weighting shifts a metric</div>
              </div>
            ))}
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <Stat title="Unweighted overall" value={fmtPct(totals.unweightedY ?? 0)} />
              <Stat title="Weighted overall" value={fmtPct(totals.weightedY ?? 0)} />
              <Stat title="Shift (pp)" value={`${(((totals.weightedY ?? 0) - (totals.unweightedY ?? 0)) * 100).toFixed(2)} pp`} />
            </div>
          </div>
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="fml2">
            <AccordionTrigger>What this shows</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>Weights = target share ÷ sample share for each segment.</li>
                <li>Design effect from weights: DEFF = 1 + CV(w)².</li>
                <li>Effective sample size n_eff = n / DEFF.</li>
                <li>Optional outcome shows headline shift after weighting.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function SignificanceChecker() {
  const [mode, setMode] = useState<"counts" | "percents">("counts");
  const [x1, setX1] = useState<number>(120);
  const [n1, setN1] = useState<number>(400);
  const [x2, setX2] = useState<number>(160);
  const [n2, setN2] = useState<number>(500);
  const [conf, setConf] = useState<number>(95);
  const [tail, setTail] = useState<"two" | "left" | "right">("two");
  const calc = useMemo(() => {
    const Z = zForCL(conf);
    let p1: number, p2: number, s1: number, s2: number;
    if (mode === "counts") { p1 = x1 / n1; p2 = x2 / n2; s1 = x1; s2 = x2; }
    else { p1 = clamp(x1 / 100, 0, 1); p2 = clamp(x2 / 100, 0, 1); s1 = p1 * n1; s2 = p2 * n2; }
    const pPool = (s1 + s2) / (n1 + n2);
    const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    const z = (p1 - p2) / sePool;
    let pval: number;
    if (tail === "two") pval = 2 * (1 - zcdf(Math.abs(z)));
    else if (tail === "right") pval = 1 - zcdf(z);
    else pval = zcdf(z);
    const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    const diff = p1 - p2;
    const ciLo = diff - Z * seDiff;
    const ciHi = diff + Z * seDiff;
    return { p1, p2, z, pval, ciLo, ciHi, diff };
  }, [mode, x1, n1, x2, n2, conf, tail]);
  const alpha = 1 - conf / 100;
  const significant = calc.pval < alpha;
  const direction = calc.diff > 0 ? "higher" : calc.diff < 0 ? "lower" : "the same as";
  const english = significant ? `At ${conf}% confidence (α=${alpha.toFixed(3)}), A is ${direction} B by ${(calc.diff * 100).toFixed(2)} pp. The difference is statistically significant (p=${calc.pval.toExponential(2)}).` : `At ${conf}% confidence (α=${alpha.toFixed(3)}), we do not have enough evidence that A and B differ (p=${calc.pval.toExponential(2)}).`;
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-6 p-6">
        <h2 className="text-xl font-semibold">Significance Test Checker (Two Proportions)</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Label>Input mode:</Label>
          <select className="border rounded-md h-10 px-3" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="counts">Counts (x / n)</option>
            <option value="percents">Percentages (%) + n</option>
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <GroupBox title="Group A">
            {mode === "counts" ? (
              <div className="grid grid-cols-2 gap-3">
                <LabeledNumber label="x (successes)" value={x1} setValue={setX1} min={0} />
                <LabeledNumber label="n (total)" value={n1} setValue={setN1} min={1} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <LabeledNumber label="% (success)" value={x1} setValue={setX1} min={0} max={100} step={0.1} />
                <LabeledNumber label="n (total)" value={n1} setValue={setN1} min={1} />
              </div>
            )}
          </GroupBox>
          <GroupBox title="Group B">
            {mode === "counts" ? (
              <div className="grid grid-cols-2 gap-3">
                <LabeledNumber label="x (successes)" value={x2} setValue={setX2} min={0} />
                <LabeledNumber label="n (total)" value={n2} setValue={setN2} min={1} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <LabeledNumber label="% (success)" value={x2} setValue={setX2} min={0} max={100} step={0.1} />
                <LabeledNumber label="n (total)" value={n2} setValue={setN2} min={1} />
              </div>
            )}
          </GroupBox>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Confidence level</Label>
            <select className="w-full border rounded-md h-10 px-3" value={conf} onChange={(e) => setConf(Number(e.target.value))}>
              <option value={90}>90%</option>
              <option value={95}>95%</option>
              <option value={99}>99%</option>
            </select>
          </div>
          <div>
            <Label>Test tail</Label>
            <select className="w-full border rounded-md h-10 px-3" value={tail} onChange={(e) => setTail(e.target.value as any)}>
              <option value="two">Two-sided</option>
              <option value="right">A &gt; B</option>
              <option value="left">A &lt; B</option>
            </select>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Result</div>
            <div className="text-xs mt-1">A = {fmtPct(calc.p1)} (n={fmtNum(n1)})</div>
            <div className="text-xs">B = {fmtPct(calc.p2)} (n={fmtNum(n2)})</div>
            <div className="text-sm mt-2">z = {calc.z.toFixed(3)}</div>
            <div className="text-sm">p = {calc.pval.toExponential(2)}</div>
            <div className="text-sm">{english}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Stat title="Diff (A − B)" value={`${(calc.diff * 100).toFixed(2)} pp`} />
          <Stat title={`${conf}% CI low`} value={`${(calc.ciLo * 100).toFixed(2)} pp`} />
          <Stat title={`${conf}% CI high`} value={`${(calc.ciHi * 100).toFixed(2)} pp`} />
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="fml3">
            <AccordionTrigger>Details</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>Hypothesis test uses pooled standard error; confidence interval uses unpooled standard error (Wald).</li>
                <li>For small samples or extreme proportions, consider an exact test.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function DropoffPredictor() {
  const [scq, setScq] = useState<number>(8);
  const [mcq, setMcq] = useState<number>(4);
  const [grid, setGrid] = useState<number>(3);
  const [open, setOpen] = useState<number>(2);
  const [mobileShare, setMobileShare] = useState<number>(60);
  const [incentive, setIncentive] = useState<number>(0);
  const [baseStartRate, setBaseStartRate] = useState<number>(0.35);
  const tSC = 6, tMC = 9, tGrid = 14, tOpen = 28;
  const calc = useMemo(() => {
    const qCount = scq + mcq + grid + open;
    const timeSec = scq * tSC + mcq * tMC + grid * tGrid + open * tOpen;
    const timeMin = timeSec / 60;
    const k = 0.18;
    const baselineComplete = 0.9;
    const decayStart = 3;
    let completeGivenStart: number;
    if (timeMin <= decayStart) completeGivenStart = baselineComplete; else completeGivenStart = baselineComplete * Math.exp(-k * (timeMin - decayStart));
    const mobilePenalty = 1 - (mobileShare / 100) * 0.15;
    const incentiveBoost = 1 + Math.min(incentive / 10, 0.25);
    const adjustedCompleteGivenStart = clamp(completeGivenStart * mobilePenalty * incentiveBoost, 0.05, 0.98);
    const overallCompleteRate = clamp(baseStartRate * adjustedCompleteGivenStart, 0.01, 0.95);
    return { qCount, timeMin, adjustedCompleteGivenStart, overallCompleteRate };
  }, [scq, mcq, grid, open, mobileShare, incentive, baseStartRate]);
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-6 p-6">
        <h2 className="text-xl font-semibold">Survey Length Drop-off Predictor</h2>
        <p className="text-sm text-muted-foreground">Heuristic based on item mix, device share, incentives, and invite→start rate.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <GroupBox title="Question mix">
            <div className="grid grid-cols-2 gap-3">
              <LabeledNumber label="Single-choice" value={scq} setValue={setScq} min={0} />
              <LabeledNumber label="Multi-choice" value={mcq} setValue={setMcq} min={0} />
              <LabeledNumber label="Grid rows" value={grid} setValue={setGrid} min={0} />
              <LabeledNumber label="Open-ends" value={open} setValue={setOpen} min={0} />
            </div>
          </GroupBox>
          <GroupBox title="Context">
            <div className="grid grid-cols-2 gap-3">
              <LabeledNumber label="Mobile share %" value={mobileShare} setValue={setMobileShare} min={0} max={100} />
              <div>
                <Label className="flex items-center gap-2">Incentive (€)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs cursor-help select-none">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter the incentive per respondent. For prize draws, estimate an average per respondent (total prize fund ÷ expected participants).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input type="number" value={incentive} min={0} step={0.5} onChange={(e) => setIncentive(Number(e.target.value))} />
              </div>
              <LabeledNumber label="Invite→Start rate" value={Math.round(baseStartRate * 100)} setValue={(v: number) => setBaseStartRate(clamp(v / 100, 0.01, 0.9))} min={1} max={90} />
              <div className="text-xs text-muted-foreground self-end">Use list quality to tune</div>
            </div>
          </GroupBox>
        </div>
        <div className="grid md:grid-cols-4 gap-4 mt-2">
          <Stat title="Estimated questions" value={fmtNum(calc.qCount)} />
          <Stat title="Median duration" value={`${calc.timeMin.toFixed(1)} min`} />
          <Stat title="Complete given start" value={fmtPct(calc.adjustedCompleteGivenStart, 1)} />
          <Stat title="Invite→complete" value={fmtPct(calc.overallCompleteRate, 1)} />
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="fml4">
            <AccordionTrigger>Assumptions</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>Time per item medians: single 6s, multi 9s, grid row 14s, open 28s.</li>
                <li>Completion among starters decays after ~3 minutes.</li>
                <li>Mobile-heavy samples have higher drop-off; incentives help modestly.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function MarketResearchToolbox() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Delve Research – Market Research Toolbox</h1>
        <p className="text-sm text-muted-foreground">Four quick, client-facing utilities.</p>
      </header>
      <Tabs defaultValue="ncalc" className="w-full">
        <TabsList className="grid grid-cols-1 md:grid-cols-4 w-full">
          <TabsTrigger value="ncalc">Sample Size</TabsTrigger>
          <TabsTrigger value="weights">Weighting Impact</TabsTrigger>
          <TabsTrigger value="sig">Significance Checker</TabsTrigger>
          <TabsTrigger value="dropoff">Drop-off Predictor</TabsTrigger>
        </TabsList>
        <TabsContent value="ncalc"><SampleSizeCalculator /></TabsContent>
        <TabsContent value="weights"><WeightingImpactVisualizer /></TabsContent>
        <TabsContent value="sig"><SignificanceChecker /></TabsContent>
        <TabsContent value="dropoff"><DropoffPredictor /></TabsContent>
      </Tabs>
      <footer className="text-xs text-muted-foreground pt-4">
        <p>© {new Date().getFullYear()} Delve Research. Prototype.</p>
      </footer>
    </div>
  );
}
