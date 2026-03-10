"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProfileSectionProps {
  title: string;
  icon: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
  onSave: () => Promise<void>;
  children: (isEditing: boolean) => React.ReactNode;
}

export default function ProfileSection({
  title,
  icon,
  isEmpty,
  emptyMessage,
  onSave,
  children,
}: ProfileSectionProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      await onSave();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel(): void {
    setIsEditing(false);
  }

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] px-6 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            {icon}
          </div>
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </CardTitle>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 py-5">
        {!isEditing && isEmpty ? (
          <p className="text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
        ) : (
          children(isEditing)
        )}
      </CardContent>
    </Card>
  );
}
