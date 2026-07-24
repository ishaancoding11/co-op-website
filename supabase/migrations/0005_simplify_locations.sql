-- Location field simplified to city/region level — fold pilot sub-neighborhoods
-- into "Newport Beach" wherever they were previously saved.
update creative_profiles set neighborhood = 'Newport Beach'
  where neighborhood in ('Corona del Mar','Balboa Peninsula','Balboa Island','Newport Heights','Lido Isle','Eastbluff','Newport Coast');
update business_profiles set neighborhood = 'Newport Beach'
  where neighborhood in ('Corona del Mar','Balboa Peninsula','Balboa Island','Newport Heights','Lido Isle','Eastbluff','Newport Coast');
update jobs set location = 'Newport Beach'
  where location in ('Corona del Mar','Balboa Peninsula','Balboa Island','Newport Heights','Lido Isle','Eastbluff','Newport Coast');
