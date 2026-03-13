import { PrismaClient } from '@prisma/client';
import { postComment } from '../lib/actions';

const prisma = new PrismaClient();

async function run() {
  const formData = new FormData();
  // Find a revision
  const revision = await prisma.revision.findFirst();
  if (!revision) {
    console.log("No revision found");
    return;
  }
  
  formData.append("revisionId", revision.id);
  formData.append("content", "Test Server Action Image Upload");
  formData.append("isAuthorAdmin", "true");
  
  // Dynamically generated blob to file
  const blob = new Blob(["dummy image byte content"], { type: "image/jpeg" });
  const file = new File([blob], "Breast_board.jpg", { type: "image/jpeg" });
  
  formData.append("attachment", file);

  try {
    const comment = await postComment(formData);
    if (comment && "error" in comment) {
      console.error("SERVER RETURNED ERROR:", comment.error);
    } else {
      console.log("Success! Comment ID:", (comment as {id: string})?.id);
    }
  } catch (err: any) {
    console.error("SERVER ERROR REPRODUCED:");
    console.error(err.message, err.stack);
  }
}

run();
