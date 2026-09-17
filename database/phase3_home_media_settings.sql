USE foodbridge;

UPDATE cms_settings
SET setting_value = JSON_REMOVE(
  JSON_SET(
    setting_value,
    '$.homeVideoUrl', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.homeVideoUrl')), ''),
    '$.homeImage1Url', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.homeImage1Url')), ''),
    '$.homeImage1Description', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.homeImage1Description')), 'Restaurants can share safe surplus food in minutes.'),
    '$.homeImage2Url', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.homeImage2Url')), ''),
    '$.homeImage2Description', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$.homeImage2Description')), 'NGOs can find, claim, and collect nearby food faster.')
  ),
  '$.favicon',
  '$.twitter',
  '$.youtube'
)
WHERE setting_key = 'website';
