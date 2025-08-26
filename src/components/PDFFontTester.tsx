import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { initializePDFFonts } from '../utils/pdfFontLoader';

// Initialize fonts when component loads
const fontsInitialized = initializePDFFonts();

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSans',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    marginBottom: 10,
  },
  rupeeTest: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});

const TestDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.title}>Font Test Document</Text>
        <Text style={styles.text}>This is regular text with NotoSans font.</Text>
        <Text style={[styles.text, { fontWeight: 700 }]}>This is bold text with NotoSans font.</Text>
        <Text style={styles.rupeeTest}>Rupee Symbol Test: ₹ 1,234.56</Text>
        <Text style={styles.text}>Price List:</Text>
        <Text style={styles.text}>• Item 1: ₹500</Text>
        <Text style={styles.text}>• Item 2: ₹1,250</Text>
        <Text style={styles.text}>• Total: ₹1,750</Text>
      </View>
    </Page>
  </Document>
);

export const PDFFontTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const testPDFGeneration = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Check if fonts are initialized
      if (!fontsInitialized) {
        // Try to initialize again
        initializePDFFonts();
      }

      // Generate PDF
      const blob = await pdf(<TestDocument />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'font-test.pdf';
      link.click();
      URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkFontRegistration = () => {
    try {
      // @ts-ignore - accessing internal method for debugging
      const registeredFonts = Font.getRegisteredFonts ? Font.getRegisteredFonts() : 'Method not available';
      console.log('Registered Fonts:', registeredFonts);
      
      // Try to re-register fonts
      initializePDFFonts();
    } catch (err) {
      console.error('Font check error:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">PDF Font Tester</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Font Status:</h3>
          <p className="text-sm">
            Fonts Initialized: {fontsInitialized ? '✅ Yes' : '❌ No'}
          </p>
        </div>

        <div className="space-x-2">
          <button
            onClick={testPDFGeneration}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Test PDF Generation'}
          </button>
          
          <button
            onClick={checkFontRegistration}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Check Font Registration
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <strong>Success!</strong> PDF generated successfully with custom fonts.
          </div>
        )}

        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <strong>Testing Steps:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Click "Check Font Registration" to verify fonts are loaded</li>
            <li>Check browser console for detailed logs</li>
            <li>Click "Test PDF Generation" to create a test PDF</li>
            <li>Open the downloaded PDF to verify the ₹ symbol displays correctly</li>
          </ol>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <strong>Font Files Location:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Regular: /fonts/NotoSans-Regular.ttf</li>
            <li>Bold: /fonts/NotoSans-Bold.ttf</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFFontTester;
