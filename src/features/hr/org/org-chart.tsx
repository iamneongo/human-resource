'use client';

import * as React from 'react';
import Dagre from '@dagrejs/dagre';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from '@xyflow/react';
import { useRouter } from 'next/navigation';

import '@xyflow/react/dist/style.css';

import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

import type { OrgNode } from './actions';

const TYPE_LABEL: Record<string, string> = {
  block: 'Khối',
  department: 'Phòng ban',
  section: 'Tổ',
  workshop: 'Xưởng'
};

const TYPE_COLOR: Record<string, string> = {
  block: 'var(--chart-1)',
  department: 'var(--chart-2)',
  section: 'var(--chart-3)',
  workshop: 'var(--chart-4)'
};

const NODE_W = 210;
const NODE_H = 92;

type NodeData = {
  code: string;
  name: string;
  type: string;
  headcount: number;
  childCount: number;
  collapsed: boolean;
  onToggle: (id: string) => void;
};

/* ------------------------------ Custom node ------------------------------ */
function OrgCardNode({ id, data }: NodeProps<Node<NodeData>>) {
  const color = TYPE_COLOR[data.type] ?? 'var(--chart-5)';
  const router = useRouter();
  return (
    <div
      className='bg-card relative rounded-lg border px-3 py-2 text-left shadow-sm cursor-pointer hover:shadow-md transition-shadow'
      style={{ width: NODE_W, borderTopColor: color, borderTopWidth: 3 }}
      onClick={(e) => {
        // Không navigate nếu click vào nút collapse/expand
        if ((e.target as HTMLElement).closest('button')) return;
        router.push(`/dashboard/org/departments/${id}/employees`);
      }}
      title='Xem danh sách nhân viên'
    >
      <Handle type='target' position={Position.Top} className='!opacity-0' />
      <div className='flex items-center justify-between gap-2'>
        <Badge variant='secondary' className='text-[10px]' style={{ color }}>
          {TYPE_LABEL[data.type] ?? data.type}
        </Badge>
        <span className='text-muted-foreground inline-flex items-center gap-1 text-xs'>
          <Icons.employee className='size-3' />
          {data.headcount}
        </span>
      </div>
      <div className='mt-1 line-clamp-2 text-sm leading-tight font-semibold'>{data.name}</div>
      <div className='text-muted-foreground text-xs'>{data.code}</div>

      {data.childCount > 0 && (
        <button
          type='button'
          onClick={() => data.onToggle(id)}
          aria-label={data.collapsed ? 'Mở rộng' : 'Thu gọn'}
          className='bg-background text-muted-foreground hover:text-foreground absolute -bottom-3 left-1/2 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm'
        >
          {data.collapsed ? (
            <span className='text-[10px] font-medium'>{data.childCount}</span>
          ) : (
            <Icons.chevronUp className='size-3.5' />
          )}
        </button>
      )}
      <Handle type='source' position={Position.Bottom} className='!opacity-0' />
    </div>
  );
}

const nodeTypes = { orgCard: OrgCardNode };

/* ------------------------------ Layout (dagre) --------------------------- */
function layout(nodes: Node<NodeData>[], edges: Edge[]) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 60 });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  Dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
  });
}

/* ------------------------------ Component -------------------------------- */
export function OrgChart({ roots }: { roots: OrgNode[] }) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const onToggle = React.useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { nodes, edges } = React.useMemo(() => {
    const rawNodes: Node<NodeData>[] = [];
    const rawEdges: Edge[] = [];

    const walk = (node: OrgNode, hiddenByAncestor: boolean) => {
      if (!hiddenByAncestor) {
        rawNodes.push({
          id: node.id,
          type: 'orgCard',
          position: { x: 0, y: 0 },
          data: {
            code: node.code,
            name: node.name,
            type: node.type,
            headcount: node.headcount,
            childCount: node.children.length,
            collapsed: collapsed.has(node.id),
            onToggle
          }
        });
      }
      const childrenHidden = hiddenByAncestor || collapsed.has(node.id);
      for (const child of node.children) {
        if (!childrenHidden) {
          rawEdges.push({
            id: `${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: 'smoothstep'
          });
        }
        walk(child, childrenHidden);
      }
    };

    roots.forEach((r) => walk(r, false));
    return { nodes: layout(rawNodes, rawEdges), edges: rawEdges };
  }, [roots, collapsed, onToggle]);

  if (!roots.length) {
    return (
      <div className='text-muted-foreground flex h-40 items-center justify-center text-sm'>
        Chưa có dữ liệu cơ cấu tổ chức.
      </div>
    );
  }

  return (
    <div className='h-[70vh] w-full rounded-lg border'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background gap={16} className='!bg-muted/30' />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className='!bg-card' />
      </ReactFlow>
    </div>
  );
}
