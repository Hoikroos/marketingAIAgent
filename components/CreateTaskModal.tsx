"use client";
import { useState } from "react";
import Modal from "./Modal";
import CreateTaskForm from "./CreateTaskForm";
import { Plus } from "./icons";
import usePerm from "./usePerm";

export default function CreateTaskModal({ users }: { users?: string[] }) {
  const canCreate = usePerm("team_create");
  const [open, setOpen] = useState(false);
  if (!canCreate) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary" type="button">
        <Plus size={15} /> Giao việc
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Giao việc mới">
        <CreateTaskForm users={users} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
