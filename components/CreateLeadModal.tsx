"use client";
import { useState } from "react";
import Modal from "./Modal";
import CreateLeadForm from "./CreateLeadForm";
import { Plus } from "./icons";
import usePerm from "./usePerm";

export default function CreateLeadModal({
  users,
}: {
  users?: { id: number; name: string }[];
}) {
  const canCreate = usePerm("leads_create");
  const [open, setOpen] = useState(false);
  if (!canCreate) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary" type="button">
        <Plus size={15} /> Thêm lead
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm lead mới">
        <CreateLeadForm users={users} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
