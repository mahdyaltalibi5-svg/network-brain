/** Offline supplier question list (shown full-screen to suppliers). */
export interface Phrase {
  key: string;
  en: string;
  zh: string;
}

export const SUPPLIER_QUESTIONS: Phrase[] = [
  { key: "price", en: "What is the unit price (FOB)?", zh: "单价是多少？（FOB价）" },
  { key: "moq", en: "What is the minimum order quantity (MOQ)?", zh: "最小起订量是多少？" },
  { key: "price_5x", en: "What is the price if we order 5 times the MOQ?", zh: "如果订购起订量的5倍，价格是多少？" },
  { key: "sample", en: "How much is a sample, including shipping to the USA?", zh: "样品多少钱？包括寄到美国的运费。" },
  { key: "lead_time", en: "How many days to produce an order?", zh: "大货生产需要多少天？" },
  { key: "logo", en: "Can you put our logo on the product?", zh: "可以在产品上印我们的logo吗？" },
  { key: "packaging", en: "Can you make custom packaging?", zh: "可以定制包装吗？" },
  { key: "factory", en: "Are you the factory or a trading company?", zh: "你们是工厂还是贸易公司？" },
  { key: "us_sellers", en: "Do you already sell this to Amazon or TikTok sellers in the USA?", zh: "这个产品你们已经卖给美国的亚马逊或TikTok卖家了吗？" },
  { key: "certs", en: "Do you have certifications (FCC, CE, CPC, FDA)?", zh: "有认证吗？（FCC、CE、CPC、FDA）" },
  { key: "trade_assurance", en: "Can we pay through Alibaba Trade Assurance?", zh: "可以通过阿里巴巴信保订单付款吗？" },
  { key: "weight", en: "What is the product weight and carton size?", zh: "产品重量和外箱尺寸是多少？" },
  { key: "photos", en: "Can you send us product photos and videos?", zh: "可以发给我们产品图片和视频吗？" },
  { key: "wechat", en: "Can we add you on WeChat?", zh: "可以加一下你的微信吗？" },
  { key: "exclusive", en: "Can we get exclusive rights for the USA?", zh: "我们可以拿到美国的独家代理吗？" },
];

export const QUICK_PHRASES: Phrase[] = [
  { key: "thanks", en: "Thank you!", zh: "谢谢！" },
  { key: "later", en: "We will contact you after the fair.", zh: "展会结束后我们会联系您。" },
  { key: "card", en: "Can I have your business card?", zh: "可以给我一张名片吗？" },
  { key: "photo", en: "May I take a photo or video?", zh: "我可以拍照或者录视频吗？" },
  { key: "expensive", en: "That price is too high for us.", zh: "这个价格对我们来说太高了。" },
  { key: "best_price", en: "What is your best price?", zh: "最低价是多少？" },
];
