USE foodbridge;

CREATE TABLE IF NOT EXISTS cms_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO cms_settings (setting_key, setting_value) VALUES
('website', '{"websiteName":"FoodBridge","websiteLogo":"","favicon":"","websiteDescription":"Connecting surplus food with people who need it.","supportEmail":"support@foodbridge.local","supportPhone":"","websiteAddress":"","facebook":"","instagram":"","linkedin":"","twitter":"","youtube":""}'),
('about', '{"heroTitle":"About FoodBridge","heroDescription":"FoodBridge connects restaurants with surplus food to NGOs that can distribute it safely.","mission":"Reduce food waste by connecting restaurants with NGOs.","vision":"A city where safe surplus food reaches people instead of landfills.","ourStory":"FoodBridge was built to make food donation faster, transparent, and measurable.","teamMembers":"","statistics":"","images":"","videoUrl":""}'),
('impact', '{"totalFoodSavedKg":"0","mealsServed":"0","activeRestaurants":"0","activeNgos":"0","citiesCovered":"0","volunteers":"0","co2Saved":"0","successStories":[]}'),
('contact', '{"phoneNumber":"","email":"support@foodbridge.local","address":"","googleMapLink":"","workingHours":"Mon-Sat, 9 AM - 6 PM","whatsappNumber":"","socialMedia":"","faq":"","emergencyContact":""}'),
('howItWorks', '{"heroTitle":"How FoodBridge Works","heroDescription":"Restaurants post food, NGOs claim it, and pickups are tracked in real time.","restaurantSteps":"Register, post surplus food, confirm pickup.","ngoSteps":"Browse food, claim safely, collect before expiry.","adminSteps":"Approve users, monitor food posts, review reports.","videoUrl":"","images":""}');
