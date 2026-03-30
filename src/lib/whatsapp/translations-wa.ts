/**
 * WhatsApp Bot Translations
 * 
 * Conversational strings for the Workflow Engine
 */

export const translationsWa = {
    en: {
        menu_return: "Reply *Menu* to return to the main dashboard.",
        invalid_option: "⚠️ Please reply with a valid option number.",
        something_went_wrong: "❌ Something went wrong. Please try again or reply *Menu*.",
        step_not_found: "❌ Step not found. Reply *Menu* to restart.",
        workflow_not_found: "❌ Workflow not found. Reply *Menu* to restart.",
        select_language: "🌐 *Choose Your Language*\n\n1️⃣ English\n2️⃣ हिंदी (Hindi)\n3️⃣ मराठी (Marathi)",
        language_set: "✅ Language set to English.",
        welcome_owner: "🏠 *RentSutra Dashboard*\nHi {{ownerName}}!",
        stats_line: "📊 {{totalBuildings}} Properties | {{totalTenants}} Tenants\n\n",
        main_menu_options: "1️⃣ View Properties\n2️⃣ Today's Payments\n3️⃣ Monthly Summary\n4️⃣ Pending Rents\n5️⃣ Send Reminders\n6️⃣ Onboard New Tenant\n7️⃣ Manage Tenants\n8️⃣ Reports & Analytics\n9️⃣ Dashboard Link",
        reminders_sent: "✅ *Success*\n\nSent {{count}} WhatsApp reminders to pending tenants.",
        no_reminders: "📢 *Rent Reminders*\n\nNo pending tenants found who match the reminder schedule today."
    },
    hi: {
        menu_return: "मुख्य डैशबोर्ड पर लौटने के लिए *Menu* लिखें।",
        invalid_option: "⚠️ कृपया एक वैध विकल्प संख्या के साथ उत्तर दें।",
        something_went_wrong: "❌ कुछ गलत हो गया। कृपया पुन: प्रयास करें या *Menu* लिखें।",
        step_not_found: "❌ स्टेप नहीं मिला। पुनः आरंभ करने के लिए *Menu* लिखें।",
        workflow_not_found: "❌ वर्कफ्लो नहीं मिला। पुनः आरंभ करने के लिए *Menu* लिखें।",
        select_language: "🌐 *अपनी भाषा चुनें*\n\n1️⃣ English\n2️⃣ हिंदी (Hindi)\n3️⃣ मराठी (Marathi)",
        language_set: "✅ भाषा अब *हिंदी* है।",
        welcome_owner: "🏠 *RentSutra डैशबोर्ड*\nनमस्ते {{ownerName}}!",
        stats_line: "📊 {{totalBuildings}} संपत्तियां | {{totalTenants}} किरायेदार\n\n",
        main_menu_options: "1️⃣ संपत्तियां देखें\n2️⃣ आज के भुगतान\n3️⃣ मासिक सारांश\n4️⃣ लंबित किराया\n5️⃣ रिमाइंडर भेजें\n6️⃣ नया किरायेदार जोड़ें\n7️⃣ किरायेदार प्रबंधित करें\n8️⃣ रिपोर्ट और एनालिटिक्स\n9️⃣ डैशबोर्ड लिंक",
        reminders_sent: "✅ *सफलता*\n\nलंबित किरायेदारों को {{count}} व्हाट्सएप रिमाइंडर भेजे गए।",
        no_reminders: "📢 *किराया रिमाइंडर*\n\nआज कोई भी ऐसा किरायेदार नहीं मिला जिसे रिमाइंडर भेजने की आवश्यकता हो।"
    },
    mr: {
        menu_return: "मुख्य डॅशबोर्डवर परत जाण्यासाठी *Menu* लिहा.",
        invalid_option: "⚠️ कृपया वैध पर्याय क्रमांकासह उत्तर द्या.",
        something_went_wrong: "❌ काहीतरी चुकले आहे. कृपया पुन्हा प्रयत्न करा किंवा *Menu* लिहा.",
        step_not_found: "❌ पायरी सापडली नाही. पुन्हा सुरू करण्यासाठी *Menu* लिहा.",
        workflow_not_found: "❌ वर्कफ्लो सापडला नाही. पुन्हा सुरू करण्यासाठी *Menu* लिहा.",
        select_language: "🌐 *तुमची भाषा निवडा*\n\n1️⃣ English\n2️⃣ हिंदी (Hindi)\n3️⃣ मराठी (Marathi)",
        language_set: "✅ भाषा आता *मराठी* आहे.",
        welcome_owner: "🏠 *RentSutra डॅशबोर्ड*\nनमस्कार {{ownerName}}!",
        stats_line: "📊 {{totalBuildings}} मालमत्ता | {{totalTenants}} पाहुणे\n\n",
        main_menu_options: "1️⃣ मालमत्ता पहा\n2️⃣ आजचे पेमेंट\n3️⃣ मासिक सारांश\n4️⃣ प्रलंबित भाडे\n5️⃣ स्मरणपत्रे पाठवा\n6️⃣ नवीन पाहुणे जोडा\n7️⃣ अतिथी व्यवस्थापन\n8️⃣ अहवाल आणि विश्लेषण\n9️⃣ डॅशबोर्ड लिंक",
        reminders_sent: "✅ *यशस्वी*\n\nप्रलंबित पाहुण्यांना {{count}} व्हॉट्सअॅप स्मरणपत्रे पाठवली.",
        no_reminders: "📢 *भाडे स्मरणपत्रे*\n\nआज स्मरणपत्र वेळापत्रकाशी जुळणारे कोणतेही प्रलंबित पाहुणे आढळले नाहीत."
    }
};

export type WaLanguage = keyof typeof translationsWa;
export type WaTranslationKey = keyof typeof translationsWa['en'];

export function t_wa(key: WaTranslationKey, lang: WaLanguage = 'en', data: any = {}): string {
    let text = translationsWa[lang][key] || translationsWa['en'][key] || key;
    
    // Simple interpolation
    return text.replace(/\{\{(\w+)\}\}/g, (_match, k) => {
        return data[k]?.toString() ?? `{{${k}}}`;
    });
}
