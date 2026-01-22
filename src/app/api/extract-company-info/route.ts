import { NextRequest, NextResponse } from 'next/server';
import { extractCompanyInfoFromImage, extractCompanyInfoFromText } from '@/ai/company-ocr';
import { createWorker } from 'tesseract.js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл байхгүй байна' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Файл хэт том байна (10MB-с бага байх ёстой)' },
        { status: 400 }
      );
    }

    let extractedInfo: any = {};

    // If it's an image, use OCR first, then AI processing
    if (file.type.startsWith('image/')) {
      try {
        // Convert file to base64 for AI processing
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type;
        const dataUrl = `data:${mimeType};base64,${base64}`;

        // Extract text using OCR first
        const worker = await createWorker('mon', 1, {
          logger: m => console.log(m)
        });

        await worker.setParameters({
          tessedit_pageseg_mode: '6', // Uniform block of text
          tessedit_ocr_engine_mode: '2' // Use LSTM OCR engine
        });

        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        // Use AI to extract structured information from the OCR text
        if (text.trim()) {
          extractedInfo = await extractCompanyInfoFromText(text);
        } else {
          // If OCR didn't work well, try direct AI processing of the image
          extractedInfo = await extractCompanyInfoFromImage(dataUrl, mimeType);
        }

      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        // Fallback to direct AI processing
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = file.type;
          const dataUrl = `data:${mimeType};base64,${base64}`;

          extractedInfo = await extractCompanyInfoFromImage(dataUrl, mimeType);
        } catch (aiError) {
          console.error('AI processing error:', aiError);
          return NextResponse.json(
            { error: 'Зургийг боловсруулахад алдаа гарлаа' },
            { status: 500 }
          );
        }
      }
    } else if (file.type === 'application/pdf' || file.type.includes('text/')) {
      // For PDF or text files, extract text directly
      try {
        const arrayBuffer = await file.arrayBuffer();
        let text = '';

        if (file.type === 'application/pdf') {
          // For PDF files, we'd need a PDF parsing library
          // For now, return an error as PDF processing requires additional setup
          return NextResponse.json(
            { error: 'PDF файлыг одоогоор дэмжихгүй байна. Зураг эсвэл текст файл оруулна уу.' },
            { status: 400 }
          );
        } else {
          // For text files
          text = new TextDecoder().decode(arrayBuffer);
        }

        if (text.trim()) {
          extractedInfo = await extractCompanyInfoFromText(text);
        }
      } catch (textError) {
        console.error('Text processing error:', textError);
        return NextResponse.json(
          { error: 'Текст файлыг боловсруулахад алдаа гарлаа' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Дэмжигдээгүй файл төрөл. Зураг эсвэл текст файл оруулна уу.' },
        { status: 400 }
      );
    }

    // Clean up the extracted data
    const cleanData = Object.fromEntries(
      Object.entries(extractedInfo).filter(([_, value]) =>
        value !== null && value !== undefined && value !== ''
      )
    );

    return NextResponse.json({
      success: true,
      data: cleanData,
      message: 'Компанийн мэдээлэл амжилттай задлагдлаа'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Мэдээлэл задлахад алдаа гарлаа' },
      { status: 500 }
    );
  }
}