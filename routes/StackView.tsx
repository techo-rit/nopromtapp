// src/routes/StackView.tsx
import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { TemplateGrid } from "../components/TemplateGrid";
import { STACKS, TEMPLATES_BY_STACK } from "../constants";
import type { Template } from "../types";

interface StackViewProps {
  onSelectTemplate: (t: Template) => void;
}

export const StackView: React.FC<StackViewProps> = ({ onSelectTemplate }) => {
  const { stackId } = useParams();
  const selectedStack = STACKS.find((s) => s.id === stackId);

  if (!selectedStack) return <Navigate to="/" replace />;

  // O(1) lookup instead of O(n) filter
  const stackTemplates = TEMPLATES_BY_STACK.get(selectedStack.id) ?? [];

  return (
    <div className="w-full h-full overflow-hidden bg-[#0a0a0a]">
      <TemplateGrid templates={stackTemplates} onSelectTemplate={onSelectTemplate} />
    </div>
  );
};