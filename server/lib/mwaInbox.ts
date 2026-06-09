/**
 * Mock workflow-inbox data for the myWorkAssistant cockpit.
 *
 * The real source will be the Tokans backend WorkflowService (gRPC) proxied
 * through these REST routes. Until that lands, these endpoints return a static,
 * deterministic mock so the embedded web cockpit is demoable. The shape mirrors
 * myWorkAssistant's `WorkflowItem` / `WorkflowComment`.
 *
 * NOTE: serverless functions are stateless, so mutations (comments/actions) are
 * echoed back but not persisted across invocations.
 */
export type WorkflowStatus = "open" | "in_progress" | "blocked" | "done";
export type WorkflowPriority = "low" | "normal" | "high" | "urgent";

export interface WorkflowItem {
  id: string;
  title: string;
  summary: string;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  kind: string;
  requester: string;
  assignee?: string;
  slaDueAt?: string;
  updatedAt: string;
  manifestId?: string;
  formId?: string;
}

export interface WorkflowComment {
  id: string;
  itemId: string;
  author: string;
  body: string;
  createdAt: string;
}

const hrs = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

export function inboxItems(): WorkflowItem[] {
  return [
    {
      id: "wf_1042",
      title: "Q2 vendor security audit — Northwind Ltd",
      summary: "Review the submitted SOC2 evidence pack and sign off the control matrix.",
      status: "in_progress",
      priority: "high",
      kind: "Audit",
      requester: "Priya Nair",
      assignee: "You",
      slaDueAt: hrs(20),
      updatedAt: hrs(-2),
    },
    {
      id: "wf_1041",
      title: "Client handoff — Acme migration to managed tier",
      summary: "Confirm runbook ownership and capture the handoff checklist before close.",
      status: "open",
      priority: "urgent",
      kind: "Handoff",
      requester: "Marcus Lee",
      slaDueAt: hrs(4),
      updatedAt: hrs(-1),
    },
    {
      id: "wf_1039",
      title: "Peer review — incident postmortem #INC-2231",
      summary: "Second-reviewer pass on the postmortem narrative and action items.",
      status: "open",
      priority: "normal",
      kind: "Review",
      requester: "Dana Whitfield",
      slaDueAt: hrs(48),
      updatedAt: hrs(-6),
    },
    {
      id: "wf_1036",
      title: "Mentoring session notes — onboarding cohort 14",
      summary: "Log the session outcomes and recommended next steps for two mentees.",
      status: "blocked",
      priority: "low",
      kind: "Mentoring",
      requester: "Sofia Marti",
      assignee: "You",
      slaDueAt: hrs(-3),
      updatedAt: hrs(-26),
    },
    {
      id: "wf_1028",
      title: "Contract amendment review — Globex SOW v3",
      summary: "Validate scope deltas against the master agreement and flag risks.",
      status: "done",
      priority: "normal",
      kind: "Review",
      requester: "Tom Becker",
      updatedAt: hrs(-72),
    },
  ];
}

export function inboxComments(itemId: string): WorkflowComment[] {
  if (itemId === "wf_1042") {
    return [
      {
        id: "c_1",
        itemId,
        author: "Priya Nair",
        body: "Evidence pack attached. The encryption-at-rest control still needs your confirmation.",
        createdAt: hrs(-3),
      },
    ];
  }
  return [];
}

export function applyAction(item: WorkflowItem, action: string): WorkflowItem {
  const status: WorkflowStatus =
    action === "reject" ? "blocked" : action === "handoff" ? "open" : "done";
  return { ...item, status, updatedAt: new Date().toISOString() };
}
