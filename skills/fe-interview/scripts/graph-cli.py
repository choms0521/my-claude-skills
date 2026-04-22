#!/usr/bin/env python3
"""
fe-interview Knowledge Graph CLI

Usage:
  python graph-cli.py add-node --id <id> --category <cat> --levels <levels> --name <name> [options]
  python graph-cli.py add-edge --from <from> --to <to> --type <type> [options]
  python graph-cli.py remove-node --id <id>
  python graph-cli.py remove-edge --from <from> --to <to>
  python graph-cli.py validate
  python graph-cli.py list-nodes [--category <cat>] [--level <level>]
  python graph-cli.py stats
"""

import argparse
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
GRAPH_DIR = SCRIPT_DIR.parent / "graph"
GRAPH_FILE = GRAPH_DIR / "_graph.json"
NODES_DIR = GRAPH_DIR / "nodes"

VALID_CATEGORIES = [
    "javascript", "html-css", "react", "typescript", "performance",
    "nextjs", "testing", "accessibility", "system-design", "security", "architecture"
]
VALID_LEVELS = ["junior", "mid", "senior"]
VALID_EDGE_TYPES = [
    "requires", "deepens", "impacts", "tradeoff",
    "alternative", "applies_to", "tests_together"
]


def load_graph():
    with open(GRAPH_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_graph(data):
    with open(GRAPH_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def update_metadata(data):
    nodes = data["nodes"]
    edges = data["edges"]
    meta = data["metadata"]

    meta["total_nodes"] = len(nodes)
    meta["total_edges"] = len(edges)

    for cat in meta["categories"]:
        meta["categories"][cat]["node_count"] = sum(
            1 for n in nodes if n["category"] == cat
        )


def cmd_add_node(args):
    data = load_graph()

    existing_ids = {n["id"] for n in data["nodes"]}
    if args.id in existing_ids:
        print(f"ERROR: Node '{args.id}' already exists.", file=sys.stderr)
        return 1

    if args.category not in VALID_CATEGORIES:
        print(f"ERROR: Invalid category '{args.category}'. Valid: {VALID_CATEGORIES}", file=sys.stderr)
        return 1

    levels = [l.strip() for l in args.levels.split(",")]
    for level in levels:
        if level not in VALID_LEVELS:
            print(f"ERROR: Invalid level '{level}'. Valid: {VALID_LEVELS}", file=sys.stderr)
            return 1

    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []

    graph_node = {
        "id": args.id,
        "type": "concept",
        "name": args.name,
        "category": args.category,
        "levels": levels,
        "tags": tags
    }
    data["nodes"].append(graph_node)

    detail_node = {
        "id": args.id,
        "type": "concept",
        "name": args.name,
        "category": args.category,
        "levels": levels,
        "description": args.description or "",
        "key_points": [],
        "model_answer_summary": "",
        "difficulty_range": {"min": "basic", "max": "advanced"},
        "sample_questions": {},
        "source_files": [],
        "references": []
    }

    node_dir = NODES_DIR / args.category
    node_dir.mkdir(parents=True, exist_ok=True)

    filename = args.id.replace(f"{args.category.replace('-', '')}-", "").replace(
        f"{args.category}-", ""
    )
    if not filename:
        filename = args.id
    node_file = node_dir / f"{filename}.json"

    with open(node_file, "w", encoding="utf-8") as f:
        json.dump(detail_node, f, ensure_ascii=False, indent=2)
        f.write("\n")

    update_metadata(data)
    save_graph(data)

    print(f"OK: Node '{args.id}' added to graph and detail file created at {node_file.relative_to(GRAPH_DIR)}")
    print(f"    Nodes: {data['metadata']['total_nodes']}, Category '{args.category}': {data['metadata']['categories'][args.category]['node_count']}")
    print(f"NOTE: Edit {node_file} to fill in key_points, model_answer_summary, sample_questions")
    return 0


def cmd_add_edge(args):
    data = load_graph()

    node_ids = {n["id"] for n in data["nodes"]}
    if args.from_node not in node_ids:
        print(f"ERROR: Source node '{args.from_node}' not found.", file=sys.stderr)
        return 1
    if args.to_node not in node_ids:
        print(f"ERROR: Target node '{args.to_node}' not found.", file=sys.stderr)
        return 1

    if args.type not in VALID_EDGE_TYPES:
        print(f"ERROR: Invalid edge type '{args.type}'. Valid: {VALID_EDGE_TYPES}", file=sys.stderr)
        return 1

    for edge in data["edges"]:
        if edge["from"] == args.from_node and edge["to"] == args.to_node:
            print(f"ERROR: Edge '{args.from_node}' -> '{args.to_node}' already exists (type: {edge['type']}).", file=sys.stderr)
            return 1

    weight = args.weight if args.weight else 0.7
    if not (0.0 < weight <= 1.0):
        print(f"ERROR: Weight must be between 0 and 1, got {weight}.", file=sys.stderr)
        return 1

    min_level = args.min_level if args.min_level else "mid"
    if min_level not in VALID_LEVELS:
        print(f"ERROR: Invalid min_level '{min_level}'. Valid: {VALID_LEVELS}", file=sys.stderr)
        return 1

    edge = {
        "from": args.from_node,
        "to": args.to_node,
        "type": args.type,
        "weight": weight,
        "min_level": min_level
    }
    if args.cross_question_seed:
        edge["cross_question_seed"] = args.cross_question_seed

    data["edges"].append(edge)
    update_metadata(data)
    save_graph(data)

    print(f"OK: Edge '{args.from_node}' --{args.type}--> '{args.to_node}' (weight: {weight}, min_level: {min_level})")
    print(f"    Total edges: {data['metadata']['total_edges']}")
    return 0


def cmd_remove_node(args):
    data = load_graph()

    node = next((n for n in data["nodes"] if n["id"] == args.id), None)
    if not node:
        print(f"ERROR: Node '{args.id}' not found.", file=sys.stderr)
        return 1

    removed_edges = [
        e for e in data["edges"]
        if e["from"] == args.id or e["to"] == args.id
    ]
    data["nodes"] = [n for n in data["nodes"] if n["id"] != args.id]
    data["edges"] = [
        e for e in data["edges"]
        if e["from"] != args.id and e["to"] != args.id
    ]

    update_metadata(data)
    save_graph(data)

    print(f"OK: Node '{args.id}' removed.")
    print(f"    Removed {len(removed_edges)} connected edge(s):")
    for e in removed_edges:
        print(f"      {e['from']} --{e['type']}--> {e['to']}")
    print(f"    Nodes: {data['metadata']['total_nodes']}, Edges: {data['metadata']['total_edges']}")
    print(f"NOTE: Detail file at nodes/{node['category']}/ was NOT deleted. Remove manually if needed.")
    return 0


def cmd_remove_edge(args):
    data = load_graph()

    edge = next(
        (e for e in data["edges"] if e["from"] == args.from_node and e["to"] == args.to_node),
        None
    )
    if not edge:
        print(f"ERROR: Edge '{args.from_node}' -> '{args.to_node}' not found.", file=sys.stderr)
        return 1

    data["edges"] = [
        e for e in data["edges"]
        if not (e["from"] == args.from_node and e["to"] == args.to_node)
    ]
    update_metadata(data)
    save_graph(data)

    print(f"OK: Edge '{args.from_node}' --{edge['type']}--> '{args.to_node}' removed.")
    print(f"    Total edges: {data['metadata']['total_edges']}")
    return 0


def cmd_validate(args):
    data = load_graph()
    errors = []
    warnings = []

    node_ids = {n["id"] for n in data["nodes"]}

    # 1. Check for duplicate node IDs
    seen_ids = set()
    for n in data["nodes"]:
        if n["id"] in seen_ids:
            errors.append(f"Duplicate node ID: {n['id']}")
        seen_ids.add(n["id"])

    # 2. Check edge references
    for e in data["edges"]:
        if e["from"] not in node_ids:
            errors.append(f"Edge references missing source: {e['from']} -> {e['to']}")
        if e["to"] not in node_ids:
            errors.append(f"Edge references missing target: {e['from']} -> {e['to']}")

    # 3. Check duplicate edges
    seen_edges = set()
    for e in data["edges"]:
        key = (e["from"], e["to"])
        if key in seen_edges:
            errors.append(f"Duplicate edge: {e['from']} -> {e['to']}")
        seen_edges.add(key)

    # 4. Check metadata consistency
    meta = data["metadata"]
    actual_nodes = len(data["nodes"])
    actual_edges = len(data["edges"])
    if meta["total_nodes"] != actual_nodes:
        errors.append(f"Metadata total_nodes ({meta['total_nodes']}) != actual ({actual_nodes})")
    if meta["total_edges"] != actual_edges:
        errors.append(f"Metadata total_edges ({meta['total_edges']}) != actual ({actual_edges})")

    for cat, info in meta["categories"].items():
        actual_count = sum(1 for n in data["nodes"] if n["category"] == cat)
        if info["node_count"] != actual_count:
            errors.append(f"Metadata {cat} node_count ({info['node_count']}) != actual ({actual_count})")

    # 5. Check valid categories and levels
    for n in data["nodes"]:
        if n["category"] not in VALID_CATEGORIES:
            errors.append(f"Node '{n['id']}' has invalid category: {n['category']}")
        for level in n.get("levels", []):
            if level not in VALID_LEVELS:
                errors.append(f"Node '{n['id']}' has invalid level: {level}")

    # 6. Check edge types
    for e in data["edges"]:
        if e["type"] not in VALID_EDGE_TYPES:
            errors.append(f"Edge '{e['from']}' -> '{e['to']}' has invalid type: {e['type']}")

    # 7. Check detail files exist
    for n in data["nodes"]:
        cat_dir = NODES_DIR / n["category"]
        if cat_dir.exists():
            found = False
            for f in cat_dir.glob("*.json"):
                with open(f, "r", encoding="utf-8") as fh:
                    try:
                        detail = json.load(fh)
                        if detail.get("id") == n["id"]:
                            found = True
                            break
                    except json.JSONDecodeError:
                        errors.append(f"Invalid JSON in {f}")
            if not found:
                warnings.append(f"No detail file for node '{n['id']}' in nodes/{n['category']}/")

    # 8. Check self-referencing edges
    for e in data["edges"]:
        if e["from"] == e["to"]:
            errors.append(f"Self-referencing edge: {e['from']} -> {e['to']}")

    # Report
    if errors:
        print(f"FAIL: {len(errors)} error(s), {len(warnings)} warning(s)\n")
        for err in errors:
            print(f"  ERROR: {err}")
    else:
        print(f"PASS: 0 errors, {len(warnings)} warning(s)")

    if warnings:
        print()
        for w in warnings:
            print(f"  WARN: {w}")

    print(f"\nSummary: {len(data['nodes'])} nodes, {len(data['edges'])} edges, {len(VALID_CATEGORIES)} categories")
    return 1 if errors else 0


def cmd_list_nodes(args):
    data = load_graph()
    nodes = data["nodes"]

    if args.category:
        nodes = [n for n in nodes if n["category"] == args.category]
    if args.level:
        nodes = [n for n in nodes if args.level in n.get("levels", [])]

    nodes.sort(key=lambda n: (n["category"], n["id"]))

    if not nodes:
        print("No nodes found matching the filter.")
        return 0

    current_cat = None
    for n in nodes:
        if n["category"] != current_cat:
            current_cat = n["category"]
            print(f"\n## {current_cat} ({sum(1 for x in nodes if x['category'] == current_cat)} nodes)")
        levels_str = ",".join(n.get("levels", []))
        print(f"  {n['id']:40s} [{levels_str:20s}] {n['name']}")

    print(f"\nTotal: {len(nodes)} node(s)")
    return 0


def cmd_stats(args):
    data = load_graph()
    nodes = data["nodes"]
    edges = data["edges"]

    print(f"=== Knowledge Graph Stats ===\n")
    print(f"Total nodes: {len(nodes)}")
    print(f"Total edges: {len(edges)}\n")

    # Category breakdown
    print("## Category Breakdown\n")
    print(f"{'Category':20s} {'Nodes':>6s} {'Junior':>8s} {'Mid':>6s} {'Senior':>8s}")
    print("-" * 52)
    for cat in VALID_CATEGORIES:
        cat_nodes = [n for n in nodes if n["category"] == cat]
        junior = sum(1 for n in cat_nodes if "junior" in n.get("levels", []))
        mid = sum(1 for n in cat_nodes if "mid" in n.get("levels", []))
        senior = sum(1 for n in cat_nodes if "senior" in n.get("levels", []))
        print(f"{cat:20s} {len(cat_nodes):>6d} {junior:>8d} {mid:>6d} {senior:>8d}")

    # Edge type breakdown
    print(f"\n## Edge Type Breakdown\n")
    edge_types = {}
    for e in edges:
        edge_types[e["type"]] = edge_types.get(e["type"], 0) + 1
    for etype in VALID_EDGE_TYPES:
        count = edge_types.get(etype, 0)
        bar = "#" * (count // 2)
        print(f"  {etype:20s} {count:>4d}  {bar}")

    # Level coverage
    print(f"\n## Level Coverage\n")
    for level in VALID_LEVELS:
        level_nodes = [n for n in nodes if level in n.get("levels", [])]
        cats_covered = len({n["category"] for n in level_nodes})
        print(f"  {level:10s}: {len(level_nodes):>3d} nodes across {cats_covered}/{len(VALID_CATEGORIES)} categories")

    # Orphan detection
    connected = set()
    for e in edges:
        connected.add(e["from"])
        connected.add(e["to"])
    orphans = [n["id"] for n in nodes if n["id"] not in connected]
    if orphans:
        print(f"\n## Orphan Nodes (no edges): {len(orphans)}")
        for o in orphans:
            print(f"  - {o}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="fe-interview Knowledge Graph CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # add-node
    p_add_node = subparsers.add_parser("add-node", help="Add a new node")
    p_add_node.add_argument("--id", required=True, help="Node ID (e.g., js-package-management)")
    p_add_node.add_argument("--category", required=True, help=f"Category: {VALID_CATEGORIES}")
    p_add_node.add_argument("--levels", required=True, help="Comma-separated levels (junior,mid,senior)")
    p_add_node.add_argument("--name", required=True, help="Display name")
    p_add_node.add_argument("--tags", default="", help="Comma-separated tags")
    p_add_node.add_argument("--description", default="", help="Node description")

    # add-edge
    p_add_edge = subparsers.add_parser("add-edge", help="Add a new edge")
    p_add_edge.add_argument("--from", dest="from_node", required=True, help="Source node ID")
    p_add_edge.add_argument("--to", dest="to_node", required=True, help="Target node ID")
    p_add_edge.add_argument("--type", required=True, help=f"Edge type: {VALID_EDGE_TYPES}")
    p_add_edge.add_argument("--weight", type=float, default=0.7, help="Edge weight 0-1 (default: 0.7)")
    p_add_edge.add_argument("--min-level", default="mid", help="Minimum level (default: mid)")
    p_add_edge.add_argument("--cross-question-seed", default="", help="Cross-question seed text")

    # remove-node
    p_rm_node = subparsers.add_parser("remove-node", help="Remove a node and its edges")
    p_rm_node.add_argument("--id", required=True, help="Node ID to remove")

    # remove-edge
    p_rm_edge = subparsers.add_parser("remove-edge", help="Remove an edge")
    p_rm_edge.add_argument("--from", dest="from_node", required=True, help="Source node ID")
    p_rm_edge.add_argument("--to", dest="to_node", required=True, help="Target node ID")

    # validate
    subparsers.add_parser("validate", help="Validate graph integrity")

    # list-nodes
    p_list = subparsers.add_parser("list-nodes", help="List nodes with filters")
    p_list.add_argument("--category", default="", help="Filter by category")
    p_list.add_argument("--level", default="", help="Filter by level")

    # stats
    subparsers.add_parser("stats", help="Show graph statistics")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "add-node": cmd_add_node,
        "add-edge": cmd_add_edge,
        "remove-node": cmd_remove_node,
        "remove-edge": cmd_remove_edge,
        "validate": cmd_validate,
        "list-nodes": cmd_list_nodes,
        "stats": cmd_stats,
    }

    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
