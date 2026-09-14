export type VehicleBrand={name:string;models:string[]}

export const VEHICLE_CATALOG:VehicleBrand[]=[
  {name:'Volkswagen',models:['Amarok','Bora','Brasília','CrossFox','Fusca','Fox','Gol','Golf','Jetta','Kombi','Nivus','Parati','Passat','Polo','Saveiro','Santana','SpaceFox','T-Cross','Taos','Tiguan','Up!','Virtus','Voyage','Outro']},
  {name:'Chevrolet',models:['Astra','Blazer','Camaro','Captiva','Celta','Chevette','Classic','Cobalt','Corsa','Cruze','Equinox','Kadett','Malibu','Meriva','Montana','Monza','Onix','Opala','Prisma','S10','Silverado','Spin','Tracker','Trailblazer','Vectra','Zafira','Outro']},
  {name:'Fiat',models:['147','Argo','Bravo','Cronos','Doblò','Ducato','Fastback','Fiorino','Freemont','Idea','Linea','Marea','Mobi','Palio','Punto','Pulse','Siena','Strada','Stilo','Tempra','Tipo','Toro','Uno','Outro']},
  {name:'Ford',models:['Belina','Bronco','Corcel','Courier','EcoSport','Edge','Escort','F-1000','F-250','Fiesta','Focus','Fusion','Ka','Maverick','Mondeo','Mustang','Pampa','Ranger','Territory','Verona','Outro']},
  {name:'Toyota',models:['Bandeirante','Camry','Corolla','Corolla Cross','Etios','Fielder','Hilux','Prius','RAV4','SW4','Yaris','Yaris Cross','Outro']},
  {name:'Honda',models:['Accord','City','Civic','CR-V','Fit','HR-V','Prelude','WR-V','ZR-V','Outro']},
  {name:'Hyundai',models:['Azera','Creta','Elantra','Equus','HB20','HB20S','HR','i30','ix35','Santa Fe','Sonata','Tucson','Veloster','Veracruz','Outro']},
  {name:'Renault',models:['Captur','Clio','Duster','Fluence','Kangoo','Kardian','Kwid','Logan','Master','Megane','Oroch','Sandero','Scenic','Symbol','Outro']},
  {name:'Nissan',models:['350Z','370Z','Altima','Frontier','Kicks','Leaf','Livina','March','Pathfinder','Sentra','Tiida','Versa','X-Trail','Outro']},
  {name:'Jeep',models:['Cherokee','Commander','Compass','Gladiator','Grand Cherokee','Renegade','Wrangler','Outro']},
  {name:'BMW',models:['Série 1','Série 2','Série 3','Série 4','Série 5','Série 6','Série 7','Série 8','M2','M3','M4','M5','X1','X2','X3','X4','X5','X6','X7','Z3','Z4','Outro']},
  {name:'Audi',models:['A1','A3','A4','A5','A6','A7','A8','Q3','Q5','Q7','Q8','R8','RS3','RS4','RS5','RS6','S3','TT','Outro']},
  {name:'Mercedes-Benz',models:['Classe A','Classe B','Classe C','Classe E','Classe G','Classe S','CLA','CLC','CLK','CLS','GLA','GLB','GLC','GLE','GLS','SLK','AMG GT','Outro']},
  {name:'Porsche',models:['718 Boxster','718 Cayman','911','Cayenne','Macan','Panamera','Taycan','Outro']},
  {name:'Peugeot',models:['106','206','207','208','2008','3008','308','408','5008','Partner','Outro']},
  {name:'Citroën',models:['Aircross','C3','C3 Aircross','C4','C4 Cactus','C4 Lounge','C5','DS3','Jumper','Xsara Picasso','Outro']},
  {name:'Mitsubishi',models:['ASX','Eclipse','Eclipse Cross','L200','Lancer','Outlander','Pajero','Pajero Sport','TR4','Outro']},
  {name:'Kia',models:['Bongo','Carnival','Cerato','Mohave','Niro','Optima','Picanto','Sorento','Soul','Sportage','Stinger','Outro']},
  {name:'Subaru',models:['BRZ','Forester','Impreza','Legacy','Outback','WRX','XV','Outro']},
  {name:'Volvo',models:['C30','S40','S60','S90','V40','V60','XC40','XC60','XC90','Outro']},
  {name:'Land Rover',models:['Defender','Discovery','Discovery Sport','Freelander','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar','Outro']},
  {name:'Suzuki',models:['Grand Vitara','Jimny','S-Cross','Swift','Vitara','Outro']},
  {name:'BYD',models:['Dolphin','Dolphin Mini','Han','King','Seal','Song Plus','Tan','Yuan Plus','Outro']},
  {name:'GWM',models:['Haval H6','Ora 03','Tank 300','Outro']},
  {name:'CAOA Chery',models:['Arrizo 5','Arrizo 6','Tiggo 2','Tiggo 3X','Tiggo 5X','Tiggo 7','Tiggo 8','Outro']},
  {name:'Dodge',models:['Challenger','Charger','Dakota','Durango','Journey','Ram','Outro']},
  {name:'RAM',models:['1500','2500','3500','Rampage','Outro']},
  {name:'Mini',models:['Cooper','Countryman','Clubman','Paceman','Outro']},
  {name:'Alfa Romeo',models:['145','147','156','159','Giulia','Mito','Stelvio','Outro']},
  {name:'Outra marca',models:['Outro modelo']},
]

export const VEHICLE_BRANDS=VEHICLE_CATALOG.map(x=>x.name)
export function vehicleModelsFor(brand:string){return VEHICLE_CATALOG.find(x=>x.name===brand)?.models||[]}
