-- Comprehensive Multi-language Translations for Guest Check-in System
-- Run this SQL in your Supabase SQL editor after running translations_migration.sql

-- Spanish (Spain) Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'es-ES',
    'Spanish',
    'Español',
    '{
        "app": {
            "title": "Sistema de Verificación de Identidad Demo",
            "subtitle": "Check-in de Huéspedes"
        },
        "form": {
            "title": "Formulario de Check-in Digital",
            "sections": {
                "personalDetails": "Datos Personales",
                "idVerification": "Verificación de Identidad",
                "emergencyContact": "Contacto de Emergencia",
                "purposeOfVisit": "Motivo de la Visita",
                "additionalGuests": "Huéspedes Adicionales"
            },
            "fields": {
                "firstName": "Nombre",
                "lastName": "Apellidos",
                "email": "Correo Electrónico",
                "phone": "Número de Teléfono",
                "address": "Dirección",
                "idType": "Tipo de Documento",
                "selectIdType": "Seleccionar Tipo de Documento",
                "uploadIdPhotos": "Subir Fotos del Documento",
                "emergencyContactName": "Nombre del Contacto de Emergencia",
                "emergencyContactPhone": "Teléfono del Contacto de Emergencia",
                "relationship": "Relación",
                "purposeOfVisit": "Motivo de la Visita",
                "termsAccepted": "Acepto los términos y condiciones",
                "marketingConsent": "Acepto recibir comunicaciones de marketing"
            },
            "purposeOptions": {
                "leisure": "Turismo / Vacaciones",
                "business": "Negocios",
                "family": "Visita Familiar",
                "medical": "Médico",
                "other": "Otro"
            },
            "idTypes": {
                "passport": "Pasaporte",
                "aadhaar": "Tarjeta Aadhaar",
                "panCard": "Tarjeta PAN",
                "drivingLicense": "Licencia de Conducir",
                "voterId": "Cédula de Identidad",
                "rationCard": "Tarjeta de Racionamiento",
                "other": "Otro"
            },
            "buttons": {
                "addGuest": "Añadir Huésped",
                "removeGuest": "Eliminar",
                "submitting": "Enviando...",
                "submitCheckIn": "Enviar Check-In"
            },
            "validation": {
                "required": "Este campo es obligatorio",
                "emailInvalid": "Por favor, introduce una dirección de correo válida",
                "invalidEmail": "Por favor, introduce una dirección de correo válida",
                "phoneInvalid": "Por favor, introduce un número de teléfono válido",
                "invalidPhone": "Por favor, introduce un número de teléfono válido",
                "termsRequired": "Debes aceptar los términos y condiciones"
            }
        },
        "placeholders": {
            "enterFirstName": "Introduce tu nombre",
            "enterLastName": "Introduce tus apellidos",
            "enterEmail": "Introduce tu correo electrónico",
            "enterPhone": "Introduce tu número de teléfono",
            "enterAddress": "Introduce tu dirección",
            "selectIdType": "Seleccionar Tipo de Documento",
            "selectPurpose": "Seleccionar motivo",
            "enterEmergencyName": "Introduce el nombre del contacto de emergencia",
            "enterEmergencyPhone": "Introduce el teléfono del contacto de emergencia",
            "enterRelationship": "Introduce la relación",
            "guestName": "Nombre del huésped {{number}}"
        },
        "options": {
            "purposes": {
                "tourism": "Turismo / Vacaciones",
                "business": "Negocios",
                "medical": "Médico",
                "education": "Educación",
                "family": "Visita Familiar",
                "other": "Otro"
            },
            "relationships": {
                "spouse": "Cónyuge",
                "parent": "Padre/Madre",
                "child": "Hijo/Hija",
                "sibling": "Hermano/Hermana",
                "friend": "Amigo/Amiga",
                "colleague": "Colega",
                "other": "Otro"
            }
        },
        "terms": {
            "agreeToTerms": "Acepto los términos y condiciones",
            "consentToDataProcessing": "Acepto los requisitos de procesamiento de datos"
        },
        "messages": {
            "checkInSuccess": "¡Check-in completado con éxito!",
            "checkInError": "Ocurrió un error durante el check-in. Por favor, inténtalo de nuevo.",
            "translationUnavailable": "Servicio de traducción temporalmente no disponible. Mostrando texto en inglés.",
            "noAdditionalGuests": "No se añadieron huéspedes adicionales",
            "thankYou": "Gracias por completar el proceso de check-in.",
            "submitError": "Error al enviar el formulario de check-in. Por favor, inténtalo de nuevo."
        },
        "languageSelector": {
            "loading": "Cargando..."
        },
        "idUpload": {
            "frontSide": "Lado Frontal",
            "backSide": "Lado Posterior",
            "uploadFront": "Subir Frontal",
            "uploadBack": "Subir Posterior",
            "dragDropText": "Arrastra y suelta tu foto de documento aquí, o haz clic para seleccionar",
            "fileTypeSupport": "Soporta: JPG, PNG, PDF (Máx 5MB)",
            "takePhoto": "Tomar Foto",
            "chooseFiles": "Elegir Archivos",
            "uploading": "Subiendo...",
            "remove": "Eliminar",
            "retake": "Volver a Tomar"
        },
        "checkInPage": {
            "loading": "Cargando...",
            "error": "Error",
            "digitalCheckIn": "Check-in Digital",
            "bookingId": "ID de Reserva:",
            "guest": "Huésped:",
            "room": "Habitación:",
            "checkInDate": "Fecha de Check-in:",
            "checkInComplete": "¡Check-in Completado!",
            "checkInSuccess": "Tu formulario de check-in ha sido enviado con éxito.",
            "alreadyCompleted": "Ya has completado el formulario de check-in. Puedes actualizarlo a continuación.",
            "canClosePageNow": "Ahora puedes cerrar esta página.",
            "processCompleted": "Proceso de check-in completado.",
            "errorPrefix": "Error: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Japanese Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'ja-JP',
    'Japanese',
    '日本語',
    '{
        "app": {
            "title": "身元確認システムデモ",
            "subtitle": "ゲストチェックイン"
        },
        "form": {
            "title": "デジタルチェックインフォーム",
            "sections": {
                "personalDetails": "個人情報",
                "idVerification": "身元確認",
                "emergencyContact": "緊急連絡先",
                "purposeOfVisit": "訪問目的",
                "additionalGuests": "追加ゲスト"
            },
            "fields": {
                "firstName": "名前",
                "lastName": "姓",
                "email": "メールアドレス",
                "phone": "電話番号",
                "address": "住所",
                "idType": "身分証明書の種類",
                "selectIdType": "身分証明書の種類を選択",
                "uploadIdPhotos": "身分証明書の写真をアップロード",
                "emergencyContactName": "緊急連絡先の名前",
                "emergencyContactPhone": "緊急連絡先の電話番号",
                "relationship": "関係",
                "purposeOfVisit": "訪問目的",
                "termsAccepted": "利用規約に同意します",
                "marketingConsent": "マーケティング通信の受信に同意します"
            },
            "purposeOptions": {
                "leisure": "観光・休暇",
                "business": "ビジネス",
                "family": "家族訪問",
                "medical": "医療",
                "other": "その他"
            },
            "idTypes": {
                "passport": "パスポート",
                "aadhaar": "Aadhaarカード",
                "panCard": "PANカード",
                "drivingLicense": "運転免許証",
                "voterId": "身分証明書",
                "rationCard": "配給カード",
                "other": "その他"
            },
            "buttons": {
                "addGuest": "ゲストを追加",
                "removeGuest": "削除",
                "submitting": "送信中...",
                "submitCheckIn": "チェックインを送信"
            },
            "validation": {
                "required": "このフィールドは必須です",
                "emailInvalid": "有効なメールアドレスを入力してください",
                "invalidEmail": "有効なメールアドレスを入力してください",
                "phoneInvalid": "有効な電話番号を入力してください",
                "invalidPhone": "有効な電話番号を入力してください",
                "termsRequired": "利用規約に同意する必要があります"
            }
        },
        "placeholders": {
            "enterFirstName": "名前を入力してください",
            "enterLastName": "姓を入力してください",
            "enterEmail": "メールアドレスを入力してください",
            "enterPhone": "電話番号を入力してください",
            "enterAddress": "住所を入力してください",
            "selectIdType": "身分証明書の種類を選択",
            "selectPurpose": "目的を選択",
            "enterEmergencyName": "緊急連絡先の名前を入力してください",
            "enterEmergencyPhone": "緊急連絡先の電話番号を入力してください",
            "enterRelationship": "関係を入力してください",
            "guestName": "ゲスト{{number}}の名前"
        },
        "options": {
            "purposes": {
                "tourism": "観光・休暇",
                "business": "ビジネス",
                "medical": "医療",
                "education": "教育",
                "family": "家族訪問",
                "other": "その他"
            },
            "relationships": {
                "spouse": "配偶者",
                "parent": "親",
                "child": "子供",
                "sibling": "兄弟姉妹",
                "friend": "友人",
                "colleague": "同僚",
                "other": "その他"
            }
        },
        "terms": {
            "agreeToTerms": "利用規約に同意します",
            "consentToDataProcessing": "データ処理要件に同意します"
        },
        "messages": {
            "checkInSuccess": "チェックインが正常に完了しました！",
            "checkInError": "チェックイン中にエラーが発生しました。もう一度お試しください。",
            "translationUnavailable": "翻訳サービスが一時的に利用できません。英語のテキストを表示しています。",
            "noAdditionalGuests": "追加ゲストは追加されていません",
            "thankYou": "チェックインプロセスを完了していただき、ありがとうございます。",
            "submitError": "チェックインフォームの送信に失敗しました。もう一度お試しください。"
        },
        "languageSelector": {
            "loading": "読み込み中..."
        },
        "idUpload": {
            "frontSide": "表面",
            "backSide": "裏面",
            "uploadFront": "表面をアップロード",
            "uploadBack": "裏面をアップロード",
            "dragDropText": "身分証明書の写真をここにドラッグ＆ドロップするか、クリックして選択してください",
            "fileTypeSupport": "対応形式：JPG、PNG、PDF（最大5MB）",
            "takePhoto": "写真を撮る",
            "chooseFiles": "ファイルを選択",
            "uploading": "アップロード中...",
            "remove": "削除",
            "retake": "再撮影"
        },
        "checkInPage": {
            "loading": "読み込み中...",
            "error": "エラー",
            "digitalCheckIn": "デジタルチェックイン",
            "bookingId": "予約ID：",
            "guest": "ゲスト：",
            "room": "部屋：",
            "checkInDate": "チェックイン日：",
            "checkInComplete": "チェックイン完了！",
            "checkInSuccess": "チェックインフォームが正常に送信されました。",
            "alreadyCompleted": "チェックインフォームは既に完了しています。以下で更新できます。",
            "canClosePageNow": "このページを閉じることができます。",
            "processCompleted": "チェックインプロセスが完了しました。",
            "errorPrefix": "エラー："
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Arabic Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'ar-SA',
    'Arabic',
    'العربية',
    '{
        "app": {
            "title": "نظام التحقق من الهوية التجريبي",
            "subtitle": "تسجيل وصول الضيوف"
        },
        "form": {
            "title": "نموذج تسجيل الوصول الرقمي",
            "sections": {
                "personalDetails": "البيانات الشخصية",
                "idVerification": "التحقق من الهوية",
                "emergencyContact": "جهة الاتصال في حالات الطوارئ",
                "purposeOfVisit": "الغرض من الزيارة",
                "additionalGuests": "ضيوف إضافيون"
            },
            "fields": {
                "firstName": "الاسم الأول",
                "lastName": "اسم العائلة",
                "email": "عنوان البريد الإلكتروني",
                "phone": "رقم الهاتف",
                "address": "العنوان",
                "idType": "نوع الهوية",
                "selectIdType": "اختر نوع الهوية",
                "uploadIdPhotos": "رفع صور الهوية",
                "emergencyContactName": "اسم جهة الاتصال في حالات الطوارئ",
                "emergencyContactPhone": "هاتف جهة الاتصال في حالات الطوارئ",
                "relationship": "العلاقة",
                "purposeOfVisit": "الغرض من الزيارة",
                "termsAccepted": "أوافق على الشروط والأحكام",
                "marketingConsent": "أوافق على تلقي الاتصالات التسويقية"
            },
            "purposeOptions": {
                "leisure": "سياحة / إجازة",
                "business": "أعمال",
                "family": "زيارة عائلية",
                "medical": "طبي",
                "other": "أخرى"
            },
            "idTypes": {
                "passport": "جواز السفر",
                "aadhaar": "بطاقة آدهار",
                "panCard": "بطاقة PAN",
                "drivingLicense": "رخصة القيادة",
                "voterId": "بطاقة الهوية",
                "rationCard": "بطاقة التموين",
                "other": "أخرى"
            },
            "buttons": {
                "addGuest": "إضافة ضيف",
                "removeGuest": "إزالة",
                "submitting": "جاري الإرسال...",
                "submitCheckIn": "إرسال تسجيل الوصول"
            },
            "validation": {
                "required": "هذا الحقل مطلوب",
                "emailInvalid": "يرجى إدخال عنوان بريد إلكتروني صحيح",
                "invalidEmail": "يرجى إدخال عنوان بريد إلكتروني صحيح",
                "phoneInvalid": "يرجى إدخال رقم هاتف صحيح",
                "invalidPhone": "يرجى إدخال رقم هاتف صحيح",
                "termsRequired": "يجب عليك قبول الشروط والأحكام"
            }
        },
        "placeholders": {
            "enterFirstName": "أدخل اسمك الأول",
            "enterLastName": "أدخل اسم عائلتك",
            "enterEmail": "أدخل عنوان بريدك الإلكتروني",
            "enterPhone": "أدخل رقم هاتفك",
            "enterAddress": "أدخل عنوانك",
            "selectIdType": "اختر نوع الهوية",
            "selectPurpose": "اختر الغرض",
            "enterEmergencyName": "أدخل اسم جهة الاتصال في حالات الطوارئ",
            "enterEmergencyPhone": "أدخل هاتف جهة الاتصال في حالات الطوارئ",
            "enterRelationship": "أدخل العلاقة",
            "guestName": "اسم الضيف {{number}}"
        },
        "options": {
            "purposes": {
                "tourism": "سياحة / إجازة",
                "business": "أعمال",
                "medical": "طبي",
                "education": "تعليم",
                "family": "زيارة عائلية",
                "other": "أخرى"
            },
            "relationships": {
                "spouse": "الزوج/الزوجة",
                "parent": "الوالد/الوالدة",
                "child": "الطفل",
                "sibling": "الأخ/الأخت",
                "friend": "صديق",
                "colleague": "زميل",
                "other": "أخرى"
            }
        },
        "terms": {
            "agreeToTerms": "أوافق على الشروط والأحكام",
            "consentToDataProcessing": "أوافق على متطلبات معالجة البيانات"
        },
        "messages": {
            "checkInSuccess": "تم إكمال تسجيل الوصول بنجاح!",
            "checkInError": "حدث خطأ أثناء تسجيل الوصول. يرجى المحاولة مرة أخرى.",
            "translationUnavailable": "خدمة الترجمة غير متاحة مؤقتاً. يتم عرض النص باللغة الإنجليزية.",
            "noAdditionalGuests": "لم يتم إضافة ضيوف إضافيين",
            "thankYou": "شكراً لك على إكمال عملية تسجيل الوصول.",
            "submitError": "فشل في إرسال نموذج تسجيل الوصول. يرجى المحاولة مرة أخرى."
        },
        "languageSelector": {
            "loading": "جاري التحميل..."
        },
        "idUpload": {
            "frontSide": "الوجه الأمامي",
            "backSide": "الوجه الخلفي",
            "uploadFront": "رفع الوجه الأمامي",
            "uploadBack": "رفع الوجه الخلفي",
            "dragDropText": "اسحب وأفلت صورة هويتك هنا، أو انقر للاختيار",
            "fileTypeSupport": "يدعم: JPG، PNG، PDF (حد أقصى 5 ميجابايت)",
            "takePhoto": "التقاط صورة",
            "chooseFiles": "اختيار الملفات",
            "uploading": "جاري الرفع...",
            "remove": "إزالة",
            "retake": "إعادة التقاط"
        },
        "checkInPage": {
            "loading": "جاري التحميل...",
            "error": "خطأ",
            "digitalCheckIn": "تسجيل الوصول الرقمي",
            "bookingId": "معرف الحجز:",
            "guest": "الضيف:",
            "room": "الغرفة:",
            "checkInDate": "تاريخ تسجيل الوصول:",
            "checkInComplete": "تم إكمال تسجيل الوصول!",
            "checkInSuccess": "تم إرسال نموذج تسجيل الوصول بنجاح.",
            "alreadyCompleted": "لقد أكملت بالفعل نموذج تسجيل الوصول. يمكنك تحديثه أدناه.",
            "canClosePageNow": "يمكنك إغلاق هذه الصفحة الآن.",
            "processCompleted": "تم إكمال عملية تسجيل الوصول.",
            "errorPrefix": "خطأ: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- German Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'de-DE',
    'German',
    'Deutsch',
    '{
        "app": {
            "title": "ID-Verifizierungssystem Demo",
            "subtitle": "Gäste-Check-in"
        },
        "form": {
            "title": "Digitales Check-in-Formular",
            "sections": {
                "personalDetails": "Persönliche Daten",
                "idVerification": "Identitätsprüfung",
                "emergencyContact": "Notfallkontakt",
                "purposeOfVisit": "Zweck des Besuchs",
                "additionalGuests": "Zusätzliche Gäste"
            },
            "fields": {
                "firstName": "Vorname",
                "lastName": "Nachname",
                "email": "E-Mail-Adresse",
                "phone": "Telefonnummer",
                "address": "Adresse",
                "idType": "Ausweistyp",
                "selectIdType": "Ausweistyp auswählen",
                "uploadIdPhotos": "Ausweisfotos hochladen",
                "emergencyContactName": "Name des Notfallkontakts",
                "emergencyContactPhone": "Telefon des Notfallkontakts",
                "relationship": "Beziehung",
                "purposeOfVisit": "Zweck des Besuchs",
                "termsAccepted": "Ich akzeptiere die Allgemeinen Geschäftsbedingungen",
                "marketingConsent": "Ich stimme dem Erhalt von Marketing-Kommunikation zu"
            },
            "purposeOptions": {
                "leisure": "Tourismus / Urlaub",
                "business": "Geschäftlich",
                "family": "Familienbesuch",
                "medical": "Medizinisch",
                "other": "Sonstiges"
            },
            "idTypes": {
                "passport": "Reisepass",
                "aadhaar": "Aadhaar-Karte",
                "panCard": "PAN-Karte",
                "drivingLicense": "Führerschein",
                "voterId": "Personalausweis",
                "rationCard": "Rationierungskarte",
                "other": "Sonstiges"
            },
            "buttons": {
                "addGuest": "Gast hinzufügen",
                "removeGuest": "Entfernen",
                "submitting": "Wird gesendet...",
                "submitCheckIn": "Check-in absenden"
            },
            "validation": {
                "required": "Dieses Feld ist erforderlich",
                "emailInvalid": "Bitte geben Sie eine gültige E-Mail-Adresse ein",
                "invalidEmail": "Bitte geben Sie eine gültige E-Mail-Adresse ein",
                "phoneInvalid": "Bitte geben Sie eine gültige Telefonnummer ein",
                "invalidPhone": "Bitte geben Sie eine gültige Telefonnummer ein",
                "termsRequired": "Sie müssen die Allgemeinen Geschäftsbedingungen akzeptieren"
            }
        },
        "placeholders": {
            "enterFirstName": "Geben Sie Ihren Vornamen ein",
            "enterLastName": "Geben Sie Ihren Nachnamen ein",
            "enterEmail": "Geben Sie Ihre E-Mail-Adresse ein",
            "enterPhone": "Geben Sie Ihre Telefonnummer ein",
            "enterAddress": "Geben Sie Ihre Adresse ein",
            "selectIdType": "Ausweistyp auswählen",
            "selectPurpose": "Zweck auswählen",
            "enterEmergencyName": "Geben Sie den Namen des Notfallkontakts ein",
            "enterEmergencyPhone": "Geben Sie die Telefonnummer des Notfallkontakts ein",
            "enterRelationship": "Geben Sie die Beziehung ein",
            "guestName": "Name des Gastes {{number}}"
        },
        "options": {
            "purposes": {
                "tourism": "Tourismus / Urlaub",
                "business": "Geschäftlich",
                "medical": "Medizinisch",
                "education": "Bildung",
                "family": "Familienbesuch",
                "other": "Sonstiges"
            },
            "relationships": {
                "spouse": "Ehepartner/in",
                "parent": "Elternteil",
                "child": "Kind",
                "sibling": "Geschwister",
                "friend": "Freund/in",
                "colleague": "Kollege/in",
                "other": "Sonstiges"
            }
        },
        "terms": {
            "agreeToTerms": "Ich stimme den Allgemeinen Geschäftsbedingungen zu",
            "consentToDataProcessing": "Ich stimme den Datenverarbeitungsanforderungen zu"
        },
        "messages": {
            "checkInSuccess": "Check-in erfolgreich abgeschlossen!",
            "checkInError": "Beim Check-in ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
            "translationUnavailable": "Übersetzungsdienst vorübergehend nicht verfügbar. Englischer Text wird angezeigt.",
            "noAdditionalGuests": "Keine zusätzlichen Gäste hinzugefügt",
            "thankYou": "Vielen Dank für das Abschließen des Check-in-Prozesses.",
            "submitError": "Fehler beim Senden des Check-in-Formulars. Bitte versuchen Sie es erneut."
        },
        "languageSelector": {
            "loading": "Wird geladen..."
        },
        "idUpload": {
            "frontSide": "Vorderseite",
            "backSide": "Rückseite",
            "uploadFront": "Vorderseite hochladen",
            "uploadBack": "Rückseite hochladen",
            "dragDropText": "Ziehen Sie Ihr Ausweisfoto hierher oder klicken Sie zum Auswählen",
            "fileTypeSupport": "Unterstützt: JPG, PNG, PDF (Max 5MB)",
            "takePhoto": "Foto Aufnehmen",
            "chooseFiles": "Dateien Auswählen",
            "uploading": "Wird Hochgeladen...",
            "remove": "Entfernen",
            "retake": "Erneut Aufnehmen"
        },
        "checkInPage": {
            "loading": "Wird geladen...",
            "error": "Fehler",
            "digitalCheckIn": "Digitaler Check-in",
            "bookingId": "Buchungs-ID:",
            "guest": "Gast:",
            "room": "Zimmer:",
            "checkInDate": "Check-in-Datum:",
            "checkInComplete": "Check-in abgeschlossen!",
            "checkInSuccess": "Ihr Check-in-Formular wurde erfolgreich übermittelt.",
            "alreadyCompleted": "Sie haben das Check-in-Formular bereits ausgefüllt. Sie können es unten aktualisieren.",
            "canClosePageNow": "Sie können diese Seite jetzt schließen.",
            "processCompleted": "Check-in-Prozess abgeschlossen.",
            "errorPrefix": "Fehler: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Italian Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'it-IT',
    'Italian',
    'Italiano',
    '{
        "app": {
            "title": "Sistema di Verifica Identità Demo",
            "subtitle": "Check-in Ospiti"
        },
        "form": {
            "title": "Modulo di Check-in Digitale",
            "sections": {
                "personalDetails": "Dati Personali",
                "idVerification": "Verifica Identità",
                "emergencyContact": "Contatto di Emergenza",
                "purposeOfVisit": "Scopo della Visita",
                "additionalGuests": "Ospiti Aggiuntivi"
            },
            "fields": {
                "firstName": "Nome",
                "lastName": "Cognome",
                "email": "Indirizzo Email",
                "phone": "Numero di Telefono",
                "address": "Indirizzo",
                "idType": "Tipo di Documento",
                "selectIdType": "Seleziona Tipo di Documento",
                "uploadIdPhotos": "Carica Foto del Documento",
                "emergencyContactName": "Nome del Contatto di Emergenza",
                "emergencyContactPhone": "Telefono del Contatto di Emergenza",
                "relationship": "Relazione",
                "purposeOfVisit": "Scopo della Visita",
                "termsAccepted": "Accetto i termini e le condizioni",
                "marketingConsent": "Accetto di ricevere comunicazioni di marketing"
            },
            "purposeOptions": {
                "leisure": "Turismo / Vacanza",
                "business": "Affari",
                "family": "Visita Familiare",
                "medical": "Medico",
                "other": "Altro"
            },
            "idTypes": {
                "passport": "Passaporto",
                "aadhaar": "Carta Aadhaar",
                "panCard": "Carta PAN",
                "drivingLicense": "Patente di Guida",
                "voterId": "Carta d''Identità",
                "rationCard": "Carta di Razionamento",
                "other": "Altro"
            },
            "buttons": {
                "addGuest": "Aggiungi Ospite",
                "removeGuest": "Rimuovi",
                "submitting": "Invio in corso...",
                "submitCheckIn": "Invia Check-In"
            },
            "validation": {
                "required": "Questo campo è obbligatorio",
                "emailInvalid": "Inserisci un indirizzo email valido",
                "invalidEmail": "Inserisci un indirizzo email valido",
                "phoneInvalid": "Inserisci un numero di telefono valido",
                "invalidPhone": "Inserisci un numero di telefono valido",
                "termsRequired": "Devi accettare i termini e le condizioni"
            }
        },
        "placeholders": {
            "enterFirstName": "Inserisci il tuo nome",
            "enterLastName": "Inserisci il tuo cognome",
            "enterEmail": "Inserisci il tuo indirizzo email",
            "enterPhone": "Inserisci il tuo numero di telefono",
            "enterAddress": "Inserisci il tuo indirizzo",
            "selectIdType": "Seleziona Tipo di Documento",
            "selectPurpose": "Seleziona scopo",
            "enterEmergencyName": "Inserisci il nome del contatto di emergenza",
            "enterEmergencyPhone": "Inserisci il telefono del contatto di emergenza",
            "enterRelationship": "Inserisci la relazione",
            "guestName": "Nome dell''ospite {{number}}"
        },
        "options": {
            "purposes": {
                "tourism": "Turismo / Vacanza",
                "business": "Affari",
                "medical": "Medico",
                "education": "Educazione",
                "family": "Visita Familiare",
                "other": "Altro"
            },
            "relationships": {
                "spouse": "Coniuge",
                "parent": "Genitore",
                "child": "Figlio/Figlia",
                "sibling": "Fratello/Sorella",
                "friend": "Amico/Amica",
                "colleague": "Collega",
                "other": "Altro"
            }
        },
        "terms": {
            "agreeToTerms": "Accetto i termini e le condizioni",
            "consentToDataProcessing": "Accetto i requisiti di elaborazione dei dati"
        },
        "messages": {
            "checkInSuccess": "Check-in completato con successo!",
            "checkInError": "Si è verificato un errore durante il check-in. Riprova.",
            "translationUnavailable": "Servizio di traduzione temporaneamente non disponibile. Mostrando testo in inglese.",
            "noAdditionalGuests": "Nessun ospite aggiuntivo aggiunto",
            "thankYou": "Grazie per aver completato il processo di check-in.",
            "submitError": "Errore nell''invio del modulo di check-in. Riprova."
        },
        "languageSelector": {
            "loading": "Caricamento..."
        },
        "idUpload": {
            "frontSide": "Lato Anteriore",
            "backSide": "Lato Posteriore",
            "uploadFront": "Carica Anteriore",
            "uploadBack": "Carica Posteriore",
            "dragDropText": "Trascina e rilascia la foto del tuo documento qui, o clicca per selezionare",
            "fileTypeSupport": "Supporta: JPG, PNG, PDF (Max 5MB)",
            "takePhoto": "Scatta Foto",
            "chooseFiles": "Scegli File",
            "uploading": "Caricamento...",
            "remove": "Rimuovi",
            "retake": "Scatta di Nuovo"
        },
        "checkInPage": {
            "loading": "Caricamento...",
            "error": "Errore",
            "digitalCheckIn": "Check-in Digitale",
            "bookingId": "ID Prenotazione:",
            "guest": "Ospite:",
            "room": "Camera:",
            "checkInDate": "Data di Check-in:",
            "checkInComplete": "Check-in Completato!",
            "checkInSuccess": "Il tuo modulo di check-in è stato inviato con successo.",
            "alreadyCompleted": "Hai già completato il modulo di check-in. Puoi aggiornarlo qui sotto.",
            "canClosePageNow": "Ora puoi chiudere questa pagina.",
            "processCompleted": "Processo di check-in completato.",
            "errorPrefix": "Errore: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Portuguese Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'pt-BR',
    'Portuguese',
    'Português',
    '{
        "app": {
            "title": "Sistema de Verificação de Identidade Demo",
            "subtitle": "Check-in de Hóspedes"
        },
        "form": {
            "title": "Formulário de Check-in Digital",
            "sections": {
                "personalDetails": "Dados Pessoais",
                "idVerification": "Verificação de Identidade",
                "emergencyContact": "Contato de Emergência",
                "purposeOfVisit": "Propósito da Visita",
                "additionalGuests": "Hóspedes Adicionais"
            },
            "fields": {
                "firstName": "Nome",
                "lastName": "Sobrenome",
                "email": "Endereço de Email",
                "phone": "Número de Telefone",
                "address": "Endereço",
                "idType": "Tipo de Documento",
                "selectIdType": "Selecionar Tipo de Documento",
                "uploadIdPhotos": "Carregar Fotos do Documento",
                "emergencyContactName": "Nome do Contato de Emergência",
                "emergencyContactPhone": "Telefone do Contato de Emergência",
                "relationship": "Relacionamento",
                "purposeOfVisit": "Propósito da Visita",
                "termsAccepted": "Aceito os termos e condições",
                "marketingConsent": "Aceito receber comunicações de marketing"
            },
            "purposeOptions": {
                "leisure": "Turismo / Férias",
                "business": "Negócios",
                "family": "Visita Familiar",
                "medical": "Médico",
                "other": "Outro"
            },
            "idTypes": {
                "passport": "Passaporte",
                "aadhaar": "Cartão Aadhaar",
                "panCard": "Cartão PAN",
                "drivingLicense": "Carteira de Motorista",
                "voterId": "Carteira de Identidade",
                "rationCard": "Cartão de Racionamento",
                "other": "Outro"
            },
            "buttons": {
                "addGuest": "Adicionar Hóspede",
                "removeGuest": "Remover",
                "submitting": "Enviando...",
                "submitCheckIn": "Enviar Check-In"
            },
            "validation": {
                "required": "Este campo é obrigatório",
                "emailInvalid": "Por favor, insira um endereço de email válido",
                "invalidEmail": "Por favor, insira um endereço de email válido",
                "phoneInvalid": "Por favor, insira um número de telefone válido",
                "invalidPhone": "Por favor, insira um número de telefone válido",
                "termsRequired": "Você deve aceitar os termos e condições"
            }
        },
        "placeholders": {
            "enterFirstName": "Digite seu nome",
            "enterLastName": "Digite seu sobrenome",
            "enterEmail": "Digite seu endereço de email",
            "enterPhone": "Digite seu número de telefone",
            "enterAddress": "Digite seu endereço",
            "selectIdType": "Selecionar Tipo de Documento",
            "selectPurpose": "Selecionar propósito",
            "enterEmergencyName": "Digite o nome do contato de emergência",
            "enterEmergencyPhone": "Digite o telefone do contato de emergência",
            "enterRelationship": "Digite o relacionamento",
            "guestName": "Nome do hóspede {{number}}"
        },
        "options": {
            "purposes": {
                "tourism": "Turismo / Férias",
                "business": "Negócios",
                "medical": "Médico",
                "education": "Educação",
                "family": "Visita Familiar",
                "other": "Outro"
            },
            "relationships": {
                "spouse": "Cônjuge",
                "parent": "Pai/Mãe",
                "child": "Filho/Filha",
                "sibling": "Irmão/Irmã",
                "friend": "Amigo/Amiga",
                "colleague": "Colega",
                "other": "Outro"
            }
        },
        "terms": {
            "agreeToTerms": "Concordo com os termos e condições",
            "consentToDataProcessing": "Concordo com os requisitos de processamento de dados"
        },
        "messages": {
            "checkInSuccess": "Check-in concluído com sucesso!",
            "checkInError": "Ocorreu um erro durante o check-in. Tente novamente.",
            "translationUnavailable": "Serviço de tradução temporariamente indisponível. Mostrando texto em inglês.",
            "noAdditionalGuests": "Nenhum hóspede adicional adicionado",
            "thankYou": "Obrigado por completar o processo de check-in.",
            "submitError": "Falha ao enviar o formulário de check-in. Tente novamente."
        },
        "languageSelector": {
            "loading": "Carregando..."
        },
        "idUpload": {
            "frontSide": "Frente",
            "backSide": "Verso",
            "uploadFront": "Carregar Frente",
            "uploadBack": "Carregar Verso",
            "dragDropText": "Arraste e solte sua foto de documento aqui, ou clique para selecionar",
            "fileTypeSupport": "Suporta: JPG, PNG, PDF (Máx 5MB)",
            "takePhoto": "Tirar Foto",
            "chooseFiles": "Escolher Arquivos",
            "uploading": "Carregando...",
            "remove": "Remover",
            "retake": "Tirar Novamente"
        },
        "checkInPage": {
            "loading": "Carregando...",
            "error": "Erro",
            "digitalCheckIn": "Check-in Digital",
            "bookingId": "ID da Reserva:",
            "guest": "Hóspede:",
            "room": "Quarto:",
            "checkInDate": "Data do Check-in:",
            "checkInComplete": "Check-in Concluído!",
            "checkInSuccess": "Seu formulário de check-in foi enviado com sucesso.",
            "alreadyCompleted": "Você já completou o formulário de check-in. Você pode atualizá-lo abaixo.",
            "canClosePageNow": "Você pode fechar esta página agora.",
            "processCompleted": "Processo de check-in concluído.",
            "errorPrefix": "Erro: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Hindi Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'hi-IN',
    'Hindi',
    'हिन्दी',
    '{
        "app": {
            "title": "पहचान सत्यापन सिस्टम डेमो",
            "subtitle": "अतिथि चेक-इन"
        },
        "form": {
            "title": "डिजिटल चेक-इन फॉर्म",
            "sections": {
                "personalDetails": "व्यक्तिगत विवरण",
                "idVerification": "पहचान सत्यापन",
                "emergencyContact": "आपातकालीन संपर्क",
                "purposeOfVisit": "यात्रा का उद्देश्य",
                "additionalGuests": "अतिरिक्त अतिथि"
            },
            "fields": {
                "firstName": "पहला नाम",
                "lastName": "अंतिम नाम",
                "email": "ईमेल पता",
                "phone": "फोन नंबर",
                "address": "पता",
                "idType": "पहचान प्रकार",
                "selectIdType": "पहचान प्रकार चुनें",
                "uploadIdPhotos": "पहचान फोटो अपलोड करें",
                "emergencyContactName": "आपातकालीन संपर्क का नाम",
                "emergencyContactPhone": "आपातकालीन संपर्क फोन",
                "relationship": "रिश्ता",
                "purposeOfVisit": "यात्रा का उद्देश्य",
                "termsAccepted": "मैं नियम और शर्तों को स्वीकार करता हूं",
                "marketingConsent": "मैं मार्केटिंग संचार प्राप्त करने के लिए सहमत हूं"
            },
            "purposeOptions": {
                "leisure": "पर्यटन / छुट्टी",
                "business": "व्यापार",
                "family": "पारिवारिक यात्रा",
                "medical": "चिकित्सा",
                "other": "अन्य"
            },
            "idTypes": {
                "passport": "पासपोर्ट",
                "aadhaar": "आधार कार्ड",
                "panCard": "पैन कार्ड",
                "drivingLicense": "ड्राइविंग लाइसेंस",
                "voterId": "मतदाता पहचान पत्र",
                "rationCard": "राशन कार्ड",
                "other": "अन्य"
            },
            "buttons": {
                "addGuest": "अतिथि जोड़ें",
                "removeGuest": "हटाएं",
                "submitting": "भेजा जा रहा है...",
                "submitCheckIn": "चेक-इन भेजें"
            },
            "validation": {
                "required": "यह फील्ड आवश्यक है",
                "emailInvalid": "कृपया एक वैध ईमेल पता दर्ज करें",
                "invalidEmail": "कृपया एक वैध ईमेल पता दर्ज करें",
                "phoneInvalid": "कृपया एक वैध फोन नंबर दर्ज करें",
                "invalidPhone": "कृपया एक वैध फोन नंबर दर्ज करें",
                "termsRequired": "आपको नियम और शर्तों को स्वीकार करना होगा"
            }
        },
        "placeholders": {
            "enterFirstName": "अपना पहला नाम दर्ज करें",
            "enterLastName": "अपना अंतिम नाम दर्ज करें",
            "enterEmail": "अपना ईमेल पता दर्ज करें",
            "enterPhone": "अपना फोन नंबर दर्ज करें",
            "enterAddress": "अपना पता दर्ज करें",
            "selectIdType": "पहचान प्रकार चुनें",
            "selectPurpose": "उद्देश्य चुनें",
            "enterEmergencyName": "आपातकालीन संपर्क का नाम दर्ज करें",
            "enterEmergencyPhone": "आपातकालीन संपर्क फोन दर्ज करें",
            "enterRelationship": "रिश्ता दर्ज करें",
            "guestName": "अतिथि {{number}} का नाम"
        },
        "options": {
            "purposes": {
                "tourism": "पर्यटन / छुट्टी",
                "business": "व्यापार",
                "medical": "चिकित्सा",
                "education": "शिक्षा",
                "family": "पारिवारिक यात्रा",
                "other": "अन्य"
            },
            "relationships": {
                "spouse": "पति/पत्नी",
                "parent": "माता-पिता",
                "child": "बच्चा",
                "sibling": "भाई/बहन",
                "friend": "मित्र",
                "colleague": "सहयोगी",
                "other": "अन्य"
            }
        },
        "terms": {
            "agreeToTerms": "मैं नियम और शर्तों से सहमत हूं",
            "consentToDataProcessing": "मैं डेटा प्रसंस्करण आवश्यकताओं से सहमत हूं"
        },
        "messages": {
            "checkInSuccess": "चेक-इन सफलतापूर्वक पूरा हुआ!",
            "checkInError": "चेक-इन के दौरान एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
            "translationUnavailable": "अनुवाद सेवा अस्थायी रूप से अनुपलब्ध है। अंग्रेजी पाठ दिखाया जा रहा है।",
            "noAdditionalGuests": "कोई अतिरिक्त अतिथि नहीं जोड़े गए",
            "thankYou": "चेक-इन प्रक्रिया पूरी करने के लिए धन्यवाद।",
            "submitError": "चेक-इन फॉर्म भेजने में विफल। कृपया पुनः प्रयास करें।"
        },
        "languageSelector": {
            "loading": "लोड हो रहा है..."
        },
        "idUpload": {
            "frontSide": "सामने की तरफ",
            "backSide": "पीछे की तरफ",
            "uploadFront": "सामने की तरफ अपलोड करें",
            "uploadBack": "पीछे की तरफ अपलोड करें",
            "dragDropText": "अपनी पहचान फोटो यहां खींचें और छोड़ें, या चुनने के लिए क्लिक करें",
            "fileTypeSupport": "समर्थित: JPG, PNG, PDF (अधिकतम 5MB)",
            "takePhoto": "फोटो लें",
            "chooseFiles": "फाइलें चुनें",
            "uploading": "अपलोड हो रहा है...",
            "remove": "हटाएं",
            "retake": "दोबारा लें"
        },
        "checkInPage": {
            "loading": "लोड हो रहा है...",
            "error": "त्रुटि",
            "digitalCheckIn": "डिजिटल चेक-इन",
            "bookingId": "बुकिंग आईडी:",
            "guest": "अतिथि:",
            "room": "कमरा:",
            "checkInDate": "चेक-इन तारीख:",
            "checkInComplete": "चेक-इन पूरा हुआ!",
            "checkInSuccess": "आपका चेक-इन फॉर्म सफलतापूर्वक भेजा गया है।",
            "alreadyCompleted": "आपने पहले ही चेक-इन फॉर्म पूरा कर लिया है। आप इसे नीचे अपडेट कर सकते हैं।",
            "canClosePageNow": "अब आप इस पेज को बंद कर सकते हैं।",
            "processCompleted": "चेक-इन प्रक्रिया पूरी हुई।",
            "errorPrefix": "त्रुटि: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Chinese (Simplified) Translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'zh-CN',
    'Chinese (Simplified)',
    '简体中文',
    '{
        "app": {
            "title": "身份验证系统演示",
            "subtitle": "客人入住登记"
        },
        "form": {
            "title": "数字入住登记表",
            "sections": {
                "personalDetails": "个人信息",
                "idVerification": "身份验证",
                "emergencyContact": "紧急联系人",
                "purposeOfVisit": "访问目的",
                "additionalGuests": "其他客人"
            },
            "fields": {
                "firstName": "名字",
                "lastName": "姓氏",
                "email": "电子邮箱",
                "phone": "电话号码",
                "address": "地址",
                "idType": "证件类型",
                "selectIdType": "选择证件类型",
                "uploadIdPhotos": "上传证件照片",
                "emergencyContactName": "紧急联系人姓名",
                "emergencyContactPhone": "紧急联系人电话",
                "relationship": "关系",
                "purposeOfVisit": "访问目的",
                "termsAccepted": "我接受条款和条件",
                "marketingConsent": "我同意接收营销通讯"
            },
            "purposeOptions": {
                "leisure": "旅游/度假",
                "business": "商务",
                "family": "探亲",
                "medical": "医疗",
                "other": "其他"
            },
            "idTypes": {
                "passport": "护照",
                "aadhaar": "Aadhaar卡",
                "panCard": "PAN卡",
                "drivingLicense": "驾驶执照",
                "voterId": "身份证",
                "rationCard": "配给卡",
                "other": "其他"
            },
            "buttons": {
                "addGuest": "添加客人",
                "removeGuest": "移除",
                "submitting": "提交中...",
                "submitCheckIn": "提交入住登记"
            },
            "validation": {
                "required": "此字段为必填项",
                "emailInvalid": "请输入有效的电子邮箱地址",
                "invalidEmail": "请输入有效的电子邮箱地址",
                "phoneInvalid": "请输入有效的电话号码",
                "invalidPhone": "请输入有效的电话号码",
                "termsRequired": "您必须接受条款和条件"
            }
        },
        "placeholders": {
            "enterFirstName": "请输入您的名字",
            "enterLastName": "请输入您的姓氏",
            "enterEmail": "请输入您的电子邮箱",
            "enterPhone": "请输入您的电话号码",
            "enterAddress": "请输入您的地址",
            "selectIdType": "选择证件类型",
            "selectPurpose": "选择目的",
            "enterEmergencyName": "请输入紧急联系人姓名",
            "enterEmergencyPhone": "请输入紧急联系人电话",
            "enterRelationship": "请输入关系",
            "guestName": "客人{{number}}姓名"
        },
        "options": {
            "purposes": {
                "tourism": "旅游/度假",
                "business": "商务",
                "medical": "医疗",
                "education": "教育",
                "family": "探亲",
                "other": "其他"
            },
            "relationships": {
                "spouse": "配偶",
                "parent": "父母",
                "child": "子女",
                "sibling": "兄弟姐妹",
                "friend": "朋友",
                "colleague": "同事",
                "other": "其他"
            }
        },
        "terms": {
            "agreeToTerms": "我同意条款和条件",
            "consentToDataProcessing": "我同意数据处理要求"
        },
        "messages": {
            "checkInSuccess": "入住登记成功完成！",
            "checkInError": "入住登记过程中发生错误。请重试。",
            "translationUnavailable": "翻译服务暂时不可用。显示英文文本。",
            "noAdditionalGuests": "未添加其他客人",
            "thankYou": "感谢您完成入住登记流程。",
            "submitError": "提交入住登记表失败。请重试。"
        },
        "languageSelector": {
            "loading": "加载中..."
        },
        "idUpload": {
            "frontSide": "正面",
            "backSide": "背面",
            "uploadFront": "上传正面",
            "uploadBack": "上传背面",
            "dragDropText": "将您的证件照片拖放到此处，或点击选择",
            "fileTypeSupport": "支持：JPG、PNG、PDF（最大5MB）",
            "takePhoto": "拍照",
            "chooseFiles": "选择文件",
            "uploading": "上传中...",
            "remove": "删除",
            "retake": "重新拍照"
        },
        "checkInPage": {
            "loading": "加载中...",
            "error": "错误",
            "digitalCheckIn": "数字入住登记",
            "bookingId": "预订ID：",
            "guest": "客人：",
            "room": "房间：",
            "checkInDate": "入住日期：",
            "checkInComplete": "入住登记完成！",
            "checkInSuccess": "您的入住登记表已成功提交。",
            "alreadyCompleted": "您已经完成了入住登记表。您可以在下方更新。",
            "canClosePageNow": "您现在可以关闭此页面。",
            "processCompleted": "入住登记流程已完成。",
            "errorPrefix": "错误："
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;