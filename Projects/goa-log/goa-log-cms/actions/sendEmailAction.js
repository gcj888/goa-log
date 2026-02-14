import { useState } from 'react'
import { useDocumentOperation } from 'sanity'

const SEND_EMAIL_URL = 'https://cabbages.info/.netlify/functions/send-email'

export function sendEmailAction(props) {
  const { id, type, published } = props
  const [sending, setSending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Only show for logEntry documents
  if (type !== 'logEntry') return null

  // Don't show if already sent
  if (published?.emailSentAt) {
    return {
      label: `Emailed ${new Date(published.emailSentAt).toLocaleDateString()}`,
      disabled: true,
      onHandle: () => {},
    }
  }

  return {
    label: sending ? 'Sending...' : 'Send Email',
    disabled: sending,
    tone: 'primary',
    dialog: dialogOpen && {
      type: 'confirm',
      message: `Send "${published?.title || 'this entry'}" to all subscribers?`,
      onConfirm: async () => {
        setSending(true)
        try {
          const res = await fetch(SEND_EMAIL_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.SANITY_STUDIO_SEND_EMAIL_SECRET || ''}`,
            },
            body: JSON.stringify({ entryId: id }),
          })

          const data = await res.json()

          if (res.ok) {
            alert(data.message || 'Email sent!')
            // Refresh the document to show emailSentAt
            window.location.reload()
          } else {
            alert(`Error: ${data.error}`)
          }
        } catch (err) {
          alert(`Failed: ${err.message}`)
        } finally {
          setSending(false)
          setDialogOpen(false)
        }
      },
      onCancel: () => setDialogOpen(false),
    },
    onHandle: () => {
      setDialogOpen(true)
    },
  }
}
