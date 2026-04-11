import { NextResponse } from 'next/server'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { uploadScreenshotSchema, type UploadScreenshotInput } from '@/lib/validations/storage-location'
import { isScreenshotRateLimited } from '@/lib/rate-limit'

/**
 * POST /api/storage-locations/screenshot
 *
 * Uploads a map screenshot (base64 JPEG or PNG) to Supabase Storage and returns
 * the public URL. Used by the Lagerplaetze feature (PROJ-10).
 *
 * Body: { storage_location_id, project_id, image_base64 }
 * Returns: { url: string }
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase, serviceClient }) => {
  // Rate limit: max 20 Uploads pro Nutzer pro Minute
  if (await isScreenshotRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Zu viele Uploads. Bitte kurz warten.' },
      { status: 429 }
    )
  }

  // Parse and validate body
  const bodyOrError = await parseJsonBody<UploadScreenshotInput>(request, uploadScreenshotSchema)
  if (bodyOrError instanceof NextResponse) return bodyOrError

  const { storage_location_id, project_id, image_base64 } = bodyOrError

  // Verify the storage location exists and belongs to a project the user can access
  const { data: location, error: locationError } = await supabase
    .from('storage_locations')
    .select('id')
    .eq('id', storage_location_id)
    .eq('project_id', project_id)
    .single()

  if (locationError || !location) {
    return NextResponse.json(
      { error: 'Lagerplatz nicht gefunden oder kein Zugriff.' },
      { status: 404 }
    )
  }

  // Decode base64 to buffer
  let imageBuffer: Buffer
  try {
    const cleanBase64 = image_base64.replace(/^data:image\/[\w+]+;base64,/, '')
    imageBuffer = Buffer.from(cleanBase64, 'base64')
  } catch {
    return NextResponse.json(
      { error: 'Ungueltige Screenshot-Daten.' },
      { status: 400 }
    )
  }

  // Detect format: PNG (89 50 4E 47) or JPEG (FF D8 FF)
  if (imageBuffer.length < 8) {
    return NextResponse.json(
      { error: 'Ungueltige Bilddaten.' },
      { status: 400 }
    )
  }
  const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50
    && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47
  const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8
  if (!isPng && !isJpeg) {
    return NextResponse.json(
      { error: 'Nur PNG- oder JPEG-Screenshots werden unterstuetzt.' },
      { status: 400 }
    )
  }
  const contentType = isJpeg ? 'image/jpeg' : 'image/png'
  const extension = isJpeg ? 'jpg' : 'png'

  // Max 10 MB
  if (imageBuffer.length > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Screenshot ist zu gross (max. 10 MB).' },
      { status: 400 }
    )
  }

  // Upload to Supabase Storage (serviceClient bypasses RLS for storage)
  const filePath = `${project_id}/${storage_location_id}.${extension}`

  const { error: uploadError } = await serviceClient.storage
    .from('storage-location-screenshots')
    .upload(filePath, imageBuffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    console.error('Screenshot upload error:', uploadError)
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Screenshots.' },
      { status: 500 }
    )
  }

  // Get public URL
  const { data: publicUrlData } = serviceClient.storage
    .from('storage-location-screenshots')
    .getPublicUrl(filePath)

  // Add cache-busting timestamp to avoid stale screenshots
  const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

  // Update the storage location with the screenshot URL (via user's supabase for RLS check)
  const { error: updateError } = await supabase
    .from('storage_locations')
    .update({ screenshot_url: publicUrl })
    .eq('id', storage_location_id)

  if (updateError) {
    console.error('Screenshot URL update error:', updateError.message)
    return NextResponse.json(
      { error: 'Screenshot gespeichert, aber Datenbankupdate fehlgeschlagen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ url: publicUrl })
})
