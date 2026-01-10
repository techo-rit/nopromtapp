// src/routes/StackView.tsx
import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { TemplateGrid } from "../components/TemplateGrid";
import { STACKS, TEMPLATES } from "../constants";
import type { Template } from "../types";

interface StackViewProps {
  onSelectTemplate: (t: Template) => void;
}

export const StackView: React.FC<StackViewProps> = ({ onSelectTemplate }) => {
  const { stackId } = useParams();
  const selectedStack = STACKS.find((s) => s.id === stackId);

  if (!selectedStack) return <Navigate to="/" replace />;

  const stackTemplates = TEMPLATES.filter((t) => t.stackId === selectedStack.id);

  return (
    <div className="w-full h-full overflow-hidden bg-[#0a0a0a]">
      <TemplateGrid templates={stackTemplates} onSelectTemplate={onSelectTemplate} />
    </div>
  );
};