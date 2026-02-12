export type DraftScope = "post" | "wiki";

export type DraftEditorState = {
  title: string | null;
  contentHtml: string;
  coverUrl: string | null;
};

export type DraftRow = {
  id: string;
  user_id: string;
  persona_id: string | null;
  scope: DraftScope;
  draft_key: string;
  title: string | null;
  content_html: string;
  cover_url: string | null;
  updated_at: string;
  created_at: string;
};
