package com.mjb96.openhybrid

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExportSafeTest {
    @Test
    fun acceptsSupportedTextExports() {
        for ((name, mime) in listOf(
            "openhybrid-training-2026-07-14.json" to "application/json",
            "openhybrid-data-export.csv" to "text/csv",
            "notes.txt" to "text/plain",
        )) {
            val request = ExportSafe.request(name, "content", mime, "file_123")
            assertNotNull(request)
            assertEquals(name, request?.filename)
            assertEquals("file_123", request?.callbackId)
        }
    }

    @Test
    fun rejectsTraversalUnsupportedMimeAndHostileCallback() {
        assertNull(ExportSafe.request("../secret.json", "{}", "application/json", "file_1"))
        assertNull(ExportSafe.request("safe.html", "x", "text/html", "file_1"))
        assertNull(ExportSafe.request("safe.json", "{}", "application/json", "x'];alert(1)//"))
    }

    @Test
    fun callbackScriptQuotesPayloadAndRejectsHostileId() {
        val script = ExportSafe.callbackScript("file_123", "{\"message\":\"it's safe\"}")
        assertNotNull(script)
        assertTrue(script!!.contains("window.__fileExportCB['file_123']"))
        assertTrue(script.contains("it\\'s safe") || script.contains("it's safe"))
        assertNull(ExportSafe.callbackScript("x'];alert(1)//", "{}"))
    }

    @Test
    fun acceptsABinaryZipArchiveAndRejectsBadInput() {
        val bytes = byteArrayOf(0x50, 0x4b, 0x03, 0x04)
        val request = ExportSafe.requestBytes("openhybrid-photos.zip", bytes, "application/zip", "file_9")
        assertNotNull(request)
        assertEquals("openhybrid-photos.zip", request?.filename)
        assertEquals("application/zip", request?.mime)
        assertArrayEquals(bytes, request?.bytes)

        // The zip mime is export-only: it still goes through the same validators.
        assertNull(ExportSafe.requestBytes("../evil.zip", bytes, "application/zip", "file_9"))
        assertNull(ExportSafe.requestBytes("photos.zip", ByteArray(0), "application/zip", "file_9"))
        assertNull(ExportSafe.requestBytes("photos.zip", bytes, "text/html", "file_9"))
        assertNull(ExportSafe.requestBytes("photos.zip", bytes, "application/zip", "x'];alert(1)//"))
    }
}
