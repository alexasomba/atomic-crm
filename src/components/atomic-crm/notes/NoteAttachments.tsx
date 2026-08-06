import { FileText } from "lucide-react";

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";

import type { AttachmentNote, ContactNote, DealNote } from "../types";

/**
 * Displays persisted note attachments in note show/list views.
 *
 * This component receives a full note record and renders all attachments.
 *
 * @param props.note - Note record containing attachments to render.
 * @returns `null` when there are no attachments, otherwise attachment previews and links.
 */
export const NoteAttachments = ({ note }: { note: ContactNote | DealNote }) => {
  if (!note.attachments || note.attachments.length === 0) {
    return null;
  }

  return (
    <AttachmentGroup className="mt-2 flex-wrap">
      {note.attachments.map((attachment: AttachmentNote, index: number) => {
        const isImage = isImageMimeType(attachment.type);
        return (
          <Attachment
            key={`${attachment.src}-${index}`}
            size="sm"
            orientation={isImage ? "vertical" : "horizontal"}
          >
            <AttachmentMedia variant={isImage ? "image" : "icon"}>
              {isImage ? (
                <img src={attachment.src} alt={attachment.title} />
              ) : (
                <FileText aria-hidden="true" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.title}</AttachmentTitle>
              <AttachmentDescription>
                {isImage ? "Image" : attachment.type || "File"}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              aria-label={`Open ${attachment.title}`}
              render={
                <a
                  href={attachment.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                />
              }
            />
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
};

/**
 * Checks whether a mime type corresponds to an image.
 *
 * @param mimeType - The attachment mime type.
 * @returns `true` when the mime type starts with `image/`.
 */
const isImageMimeType = (mimeType?: string): boolean => {
  if (!mimeType) {
    return false;
  }
  return mimeType.startsWith("image/");
};
