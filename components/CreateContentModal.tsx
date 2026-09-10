"use client";
import { useState } from "react";
import Modal from "./Modal";
import CreateContentForm from "./CreateContentForm";
import { Plus } from "./icons";

export default function CreateContentModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary" type="button">
        <Plus size={15} /> Tạo nội dung
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tạo nội dung mới">
        <CreateContentForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
