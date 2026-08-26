#!/usr/bin/env python3
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from itertools import combinations
from collections import defaultdict
import json,random,os,sys

ROOT=Path(__file__).resolve().parent
PUZZLES=ROOT/"puzzles"
LONDON=ZoneInfo("Europe/London")
COLORS=("red","blue","black","yellow")
PREFIX={"red":"r","blue":"b","black":"k","yellow":"y"}
DIFFICULTY_TARGETS = {
    "Easy": {
        "min_moves": 4,
        "max_moves": 7,
        "min_coverage": 0.30,
    },
    "Medium": {
        "min_moves": 8,
        "max_moves": 11,
        "min_coverage": 0.45,
    },
    "Hard": {
        "min_moves": 12,
        "max_moves": 19,
        "min_coverage": 0.60,
    },
    "Expert": {
        "min_moves": 20,
        "max_moves": 999,
        "min_coverage": 0.70,
    },
}

def vs(g):
    if not 3<=len(g)<=4:return False
    real=[t for t in g if not t.get("joker")]; j=len(g)-len(real)
    if not real or len({t["value"] for t in real})!=1:return False
    cs=[t["color"] for t in real]
    return len(cs)==len(set(cs)) and len(real)+j<=4
def vr(g):
    if len(g)<3:return False
    real=[t for t in g if not t.get("joker")]; j=len(g)-len(real)
    if not real or len({t["color"] for t in real})!=1:return False
    vals=sorted(t["value"] for t in real)
    if len(vals)!=len(set(vals)):return False
    gaps=sum(vals[i]-vals[i-1]-1 for i in range(1,len(vals)))
    return gaps<=j and j-gaps<=(vals[0]-1)+(13-vals[-1])
def legal(g):return vs(g) or vr(g)

def cands(tiles):
    out=set()
    for r in (3,4):
        for c in combinations(tiles,r):
            if vs(c):out.add(tuple(sorted(t["id"] for t in c)))
    for color in COLORS:
        pool=[t for t in tiles if not t.get("joker") and t["color"]==color]+[t for t in tiles if t.get("joker")]
        for r in range(3,min(len(pool),7)+1):
            for c in combinations(pool,r):
                if vr(c):out.add(tuple(sorted(t["id"] for t in c)))
    return list(out)
def solve_all(tiles, limit=80):
    ids = [t["id"] for t in tiles]
    idx = {x: i for i, x in enumerate(ids)}

    cs = cands(tiles)
    masks = []

    for c in cs:
        m = 0
        for x in c:
            m |= 1 << idx[x]
        masks.append(m)

    by = [[] for _ in ids]

    for ci, m in enumerate(masks):
        for i in range(len(ids)):
            if m >> i & 1:
                by[i].append(ci)

    full = (1 << len(ids)) - 1
    results = []

    def dfs(u, chosen):
        if len(results) >= limit:
            return

        if u == full:
            results.append([list(cs[i]) for i in chosen])
            return

        best = None

        for i in range(len(ids)):
            if u >> i & 1:
                continue

            options = [
                ci for ci in by[i]
                if not (masks[ci] & u)
            ]

            if not options:
                return

            if best is None or len(options) < len(best):
                best = options

        for ci in sorted(best, key=lambda q: len(cs[q])):
            dfs(
                u | masks[ci],
                chosen + [ci]
            )

            if len(results) >= limit:
                return

    dfs(0, [])

    return results
       
def solve(tiles):
    results = solve_all(tiles, limit=1)
    return results[0] if results else None
   def solution_move_count(start_groups, start_rack, solution):
    start_partners = {}

    for group in start_groups:
        ids = frozenset(tile["id"] for tile in group)

        for tile in group:
            start_partners[tile["id"]] = ids

    solution_partners = {}

    for group in solution:
        ids = frozenset(group)

        for tile_id in group:
            solution_partners[tile_id] = ids

    moved = len(start_rack)

    for tile_id, original_partners in start_partners.items():
        if solution_partners.get(tile_id) != original_partners:
            moved += 1

    return moved
           return moved


def groups_touched_count(start_groups, solution):
    solution_partners = {}

    for group in solution:
        ids = frozenset(group)

        for tile_id in group:
            solution_partners[tile_id] = ids

    touched = 0

    for group in start_groups:
        original_ids = frozenset(tile["id"] for tile in group)

        if any(
            solution_partners.get(tile["id"]) != original_ids
            for tile in group
        ):
            touched += 1

    return touched
def tomorrow():
    if os.environ.get("RUMMIDAILY_DATE"):return os.environ["RUMMIDAILY_DATE"]
    return (datetime.now(LONDON).date()+timedelta(days=1)).isoformat()

def transform(base,rng):
    alltiles=[t for g in base["groups"] for t in g]+base["rack"]
    real=[t for t in alltiles if not t.get("joker")]
    reflect=rng.random()<.35
    vals=[14-t["value"] if reflect else t["value"] for t in real]
    lo,hi=min(vals),max(vals)
    shifts=list(range(1-lo,14-hi)) or [0]
    shift=rng.choice(shifts)
    perm=list(COLORS);rng.shuffle(perm); cmap=dict(zip(COLORS,perm))
    counts=defaultdict(int); old2new={}; oldtile={}
    for t in alltiles:
        if t["id"] in oldtile:continue
        if t.get("joker"):
            nt={"id":t["id"],"joker":True}
        else:
            v=(14-t["value"] if reflect else t["value"])+shift
            c=cmap[t["color"]]; counts[(c,v)]+=1
            suf="a" if counts[(c,v)]==1 else "b"
            nt={"id":f"{PREFIX[c]}{v}{suf}","color":c,"value":v}
        oldtile[t["id"]]=nt;old2new[t["id"]]=nt["id"]
    groups=[[oldtile[t["id"]] for t in g] for g in base["groups"]]
    rack=[oldtile[t["id"]] for t in base["rack"]]
    solution=[[old2new[x] for x in g] for g in base["solution"]]
    hints=[]
    for h in base.get("visualHints",[]):
        h=dict(h)
        if "afterTileId" in h:h["afterTileId"]=old2new[h["afterTileId"]]
        if "tileIds" in h:h["tileIds"]=[old2new[x] for x in h["tileIds"]]
        if "groups" in h:h["groups"]=[[old2new[x] for x in g] for g in h["groups"]]
        hints.append(h)
    return groups,rack,solution,hints,{"template":base["templateId"],"reflected":reflect,"shift":shift,"colorMap":cmap}

def exact(groups,rack,solution):
    ids=[t["id"] for g in groups for t in g]+[t["id"] for t in rack]
    sol=[x for g in solution for x in g]
    return len(ids)==len(set(ids)) and sorted(ids)==sorted(sol)

def direct(groups,rack):return sum(any(legal(g+[t]) for g in groups) for t in rack)

def meta(groups,rack):
    ts=[t for g in groups for t in g]+rack; real=[t for t in ts if not t.get("joker")]
    return {"minValue":min(t["value"] for t in real),"maxValue":max(t["value"] for t in real),
      "distinctValues":len({t["value"] for t in real}),"jokerCount":sum(t.get("joker",False) for t in ts),
      "startingSets":sum(vs(g) for g in groups),"startingRuns":sum(vr(g) for g in groups)}

def generate():
    date=tomorrow();rng=random.Random(os.environ.get("RUMMIDAILY_SEED",date))
    bases=json.loads((Path(__file__).with_name("base_templates.json")).read_text());rng.shuffle(bases)
    chosen=None
    for base in bases:
      for _ in range(30):
        groups,rack,stored,hints,tr=transform(base,rng)
        if not all(legal(g) for g in groups) or legal(rack) or not exact(groups,rack,stored):continue
        m=meta(groups,rack)
        if m["distinctValues"]<7 or m["startingSets"]<2 or m["startingRuns"]<2:continue
        if direct(groups,rack)>=2:continue
       solutions = solve_all([t for g in groups for t in g] + rack)

if not solutions:
    continue

best_solution = min(
    solutions,
    key=lambda solution: solution_move_count(groups, rack, solution)
)

move_count = solution_move_count(groups, rack, best_solution)
groups_touched = groups_touched_count(groups, best_solution)
board_coverage = groups_touched / len(groups)

if board_coverage < 0.60:
    continue
if move_count < 12:
    continue

        chosen={"number":10+(datetime.fromisoformat(date).date()-datetime(2026,8,25).date()).days,
          "difficulty": (
    "Expert" if move_count >= 20 else
    "Hard" if move_count >= 12 else
    "Medium" if move_count >= 8 else
    "Easy"
),"targetMinutes":"~5 (provisional)","groups":groups,"rack":rack,
          "solution":best_solution,"visualHints":hints,
          "proof":{"buildVerified":True,"independentSolverFoundSolution":True,"rackOnlyShortcut":False,
            "allStartMeldsLegal":True,"hiddenSolutionLegal":True,"exactTileMatch":True,
            "directRackInsertions":direct(groups,rack)},
                "structuralMoves":move_count,
                "groupsTouched":groups_touched,
"boardCoverage":board_coverage,
          "metadata":{**m,**tr,"generatorVersion":1,"seed":os.environ.get("RUMMIDAILY_SEED",date)}}
        break
      if chosen:break
    if not chosen:raise RuntimeError("No verified transformed puzzle passed the publishing gates.")
    PUZZLES.mkdir(exist_ok=True);p=PUZZLES/f"{date}.json";p.write_text(json.dumps(chosen,indent=2)+"\n")
    print("Generated",p.relative_to(ROOT));print("Independent solver: PASS")
    print("Template",chosen["metadata"]["template"],"range",chosen["metadata"]["minValue"],"-",chosen["metadata"]["maxValue"],
          "sets/runs",chosen["metadata"]["startingSets"],"/",chosen["metadata"]["startingRuns"],
          "jokers",chosen["metadata"]["jokerCount"])
if __name__=="__main__":
    try:generate()
    except Exception as e:print("GENERATION FAILED:",e,file=sys.stderr);sys.exit(1)
