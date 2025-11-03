import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { DbService } from 'src/db/db.service';
import * as twillio from 'twilio'

@Injectable()
export class CommonService {
  private readonly SYDENYAIRPORTLAT: number;
  private readonly SYDENYAIRPORTLNG: number;

  private readonly authKey = '454209Ahv3Rk6Fn683d3cf6P1';
  private readonly senderId = 'tiptop'; // better to use env
  private readonly templateId = '683d35e5d6fc055b146a8552'; // your flow ID

  constructor(
    private readonly model: DbService,
    private readonly configService: ConfigService,
  ) {
    this.SYDENYAIRPORTLAT = parseFloat(this.configService.get<string>('SYDENYAIRPORTLAT'));
    this.SYDENYAIRPORTLNG = parseFloat(this.configService.get<string>('SYDENYAIRPORTLNG'));
  }

  async calculateDistanceWithStops(
    pickUpLat: any,
    pickUpLong: any,
    dropLat: any,
    dropLong: any,
    stops: any[],
  ): Promise<number | null> {
    const apiKey = process.env.GOOGLEAPIKEY;
    try {
      let waypoints = '';
      if (stops) {
        waypoints = stops.map((stop) => `${stop.lat},${stop.long}`).join('|');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${pickUpLat},${pickUpLong}&destination=${dropLat},${dropLong}&waypoints=${waypoints}&key=${apiKey}`,
      );


      const routes = response.data.routes;
      if (routes && routes.length > 0) {
        // Sum up distances of all legs in the route
        let totalDistance = 0;
        routes.forEach((route) => {
          route.legs.forEach((leg) => {
            totalDistance += leg.distance.value;
          });
        });
        const distance: any = (totalDistance / 1000).toFixed(1); // Convert meters to kilometers
        return distance;
      } else {
        console.error('Error', response.data);
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('Error:', error);
      throw new Error('No routes found');
    }
  }
  async getDuration(
    pickUpLat: string,
    pickUpLong: string,
    driverLat: string,
    driverLong: string,
  ): Promise<string> {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${driverLat},${driverLong}&destinations=${pickUpLat},${pickUpLong}&key=${process.env.GOOGLEAPIKEY}`;

      const response = await axios.get(url);
      const data = response.data;

      if (data.status === 'OK') {
        const duration = data.rows[0].elements[0].duration.text;
        return duration;
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
  async calculate_radius_distance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const qqq = await this.deg2rad(lat1); // deg2rad below
    const www = await this.deg2rad(lat2);
    const dLat = await this.deg2rad(lat2 - lat1); // deg2rad below
    const dLon = await this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(qqq) * Math.cos(www) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  async deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  async checkDistancefromSydney(
    currentLat, currentLng
  ): Promise<string> {
    try {
      //in dev henceforth location
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${currentLat},${currentLng}&destinations=${this.SYDENYAIRPORTLAT},${this.SYDENYAIRPORTLNG}&key=${process.env.GOOGLEAPIKEY}`;
      console.log("url", url);
      const response = await axios.get(url);
      const data = response.data;

      const distance = data.rows[0].elements[0].distance.value;
      const distanceInKm: any = distance / 1000; // Convert to kilometers
      return distanceInKm

    } catch (error) {
      console.log('error', error);
      // throw error;
    }
  }

  // send_notification = async (pushData: any, fcm_tokens: any, data: any) => {
  //   try {
  //     const stringData: { [key: string]: string } = {};
  //     for (const key in data) {
  //       if (data.hasOwnProperty(key)) {
  //         stringData[key] = String(data[key]);
  //       }
  //     }
  //     if (data["booking"]) {
  //       stringData["booking"] = JSON.stringify(data["booking"]);
  //     }
  //     // Validate FCM token
  //     if (!fcm_tokens || typeof fcm_tokens !== 'string' || fcm_tokens.trim() === '') {
  //       throw new Error('Invalid FCM token');
  //     }
  //     // Validate pushData
  //     if (!pushData.title || !pushData.message) {
  //       throw new Error('Invalid pushData: title and message are required');
  //     }
  //     console.log(pushData.title, pushData.message), '<---pushData.title || !pushData.message';

  //     const payload: admin.messaging.Message = {
  //       data: stringData,
  //       notification: {
  //         title: pushData.title,
  //         body: pushData.message,
  //       },
  //       android: {
  //         priority: "high",
  //         notification: {
  //           sound: "default",
  //         },
  //       },
  //       apns: {
  //         payload: {
  //           aps: {
  //             contentAvailable: true,
  //             sound: "default",
  //           },
  //         },
  //       },
  //       token: fcm_tokens  // Specify the single device token here
  //     };
  //     console.log(JSON.stringify(payload), '<-------------payload of sending')
  //     const response = await this.firebaseAdmin.messaging().send(payload);
  //     console.log('Notification sent successfully:========>', response);
  //     return response
  //   } catch (error) {
  //     console.error('Error sending notification:', error);
  //     throw error
  //   }
  // };

  async localization(language, key) {
    try {
      const data = await this.model.language.findOne({ key: key });
      return data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async set_options(pagination: number, limit: number, sort_by = -1) {
    try {
      let options: any = {
        lean: true,
        sort: { _id: sort_by || -1 },
      };
      if (!pagination && !limit) {
        options = {
          lean: true,
          sort: { _id: sort_by || -1 },
          limit: 100,
          pagination: 0,
          skip: 0,
        };
      } else if (!pagination && limit) {
        options = {
          lean: true,
          sort: { _id: sort_by || -1 },
          limit: Number(limit),
          skip: 0,
        };
      } else if (pagination && !limit) {
        options = {
          lean: true,
          sort: { _id: sort_by || -1 },
          skip: Number(pagination) * Number(process.env.DEFAULT_LIMIT),
          limit: Number(process.env.DEFAULT_LIMIT),
        };
      } else if (pagination && limit) {
        options = {
          lean: true,
          sort: { _id: sort_by ? sort_by : -1 },
          limit: Number(limit),
          skip: 0 + (pagination - 1) * limit,
        };
      }
      return options;
    } catch (err) {
      throw err;
    }
  }

  async set_options_ace(pagination: number, limit: number, sort_by = -1) {
    try {
      let options: any = {
        lean: true,
        sort: { schedule_date: 1 },
      };
      if (!pagination && !limit) {
        options = {
          lean: true,
          sort: { schedule_date: 1 },
          limit: 100,
          pagination: 0,
          skip: 0,
        };
      } else if (!pagination && limit) {
        options = {
          lean: true,
          sort: { schedule_date: 1 },
          limit: Number(limit),
          skip: 0,
        };
      } else if (pagination && !limit) {
        options = {
          lean: true,
          sort: { schedule_date: 1 },
          skip: Number(pagination) * Number(process.env.DEFAULT_LIMIT),
          limit: Number(process.env.DEFAULT_LIMIT),
        };
      } else if (pagination && limit) {
        options = {
          lean: true,
          sort: { schedule_date: 1 },
          limit: Number(limit),
          skip: 0 + (pagination - 1) * limit,
        };
      }
      return options;
    } catch (err) {
      throw err;
    }
  }

  // async sendotp(otp, phone): Promise<any> {
  //   try {
  //     let twilio_client = twillio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  //     console.log("otp")
  //     console.log("phone", phone);
  //     console.log(`OTP FOR ${phone} is: ${otp}`)

  //     return twilio_client.messages.create({
  //       body: `DO NOT SHARE this code with anyone for account safety. \n\nYour TipTop Ride  Account verification code is: ${otp}`,
  //       from: process.env.TWILIO_PHONE_NUMBER,
  //       to: "+" + phone,
  //     });
  //   }
  //   catch (error) {
  //     throw error;
  //   }
  // }

  async sendOtpSMS(otp, country_code, phone): Promise<any> {
    try {
      const url = "https://control.msg91.com/api/v2/sendsms";

      const headers = {
        authkey: this.authKey,
        'Content-Type': 'application/json',
      };
      const payload = {
        sender: this.senderId,
        template_id: this.templateId,
        route: '4',
        country: "+" + country_code,
        sms: [
          {
            message: `DO NOT SHARE this code with anyone for account safety. \n\nYour TipTop Ride  Account verification code is: ${otp}`,
            to: [phone],
          },
        ],
      };

      console.log("otp", `${otp}`)
      console.log("phone", phone);
      const response = await axios.post(url, payload, { headers });
      console.log("response", response.data);
    }
    catch (error) {
      throw error;
    }
  }

  async reverseGeocode(lat: string, long: string): Promise<string> {
    try {
      const apiKey = process.env.GOOGLEAPIKEY; // Replace with your Google Maps API key
      console.log("lat,", lat);
      console.log("lat,", long);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;

      const response = await axios.get(url);
      // console.log("Response from Google Geocode API:", response.data);


      if (response.data.status === 'OK') {
        const results = response.data.results;

        for (const result of results) {
          const addressComponents = result.address_components;

          // Try to find the 'locality' (city)
          const cityComponent = addressComponents.find((component) =>
            component.types.includes('locality')
          );

          if (cityComponent) {
            console.log("City Found:", cityComponent.long_name);
            return cityComponent.long_name; // Return the city name
          }

          // Try to find the 'sublocality' (smaller area)
          const sublocalityComponent = addressComponents.find((component) =>
            component.types.includes('sublocality')
          );

          if (sublocalityComponent) {
            console.log("Sublocality Found:", sublocalityComponent.long_name);
            return sublocalityComponent.long_name; // Return the sublocality
          }

          // Try to find the 'administrative_area_level_1' (state/region)
          const adminAreaComponent = addressComponents.find((component) =>
            component.types.includes('administrative_area_level_1')
          );

          if (adminAreaComponent) {
            console.log("Admin Area Found:", adminAreaComponent.long_name);
            return adminAreaComponent.long_name; // Return the state/region
          }
        }

        throw new HttpException(
          'City not found in reverse geocoding results',
          HttpStatus.NOT_FOUND,
        );
      } else {
        throw new HttpException(
          'Geocoding API Error: ' + response.data.status,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.error('Error in reverseGeocode:', error.message);
      throw new HttpException(
        'Error in reverse geocoding API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  async getTollCharges(dataBody: any): Promise<any> {

    let googleApiConst = process.env.GOOGLEAPIKEY;
    let url = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiConst,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,travel_advisory.tollInfo,duration,distanceMeters,status',
    };

    const config: AxiosRequestConfig = {
      headers,
    };

    console.log('JSON.stringify(dataBody)', JSON.stringify(dataBody))

    try {
      const response = await axios.post(url, dataBody, config);
      return response.data;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  async calculateTotalTollCharges(pickup: any, stops: any[] = [], destination: any): Promise<number | null> {
    // Combine all points, spreading stops
    const allPoints = [pickup, ...stops, destination];

    // Create origin and destination pairs
    const originStops = allPoints.slice(0, allPoints.length - 1);
    const destinationStops = allPoints.slice(1);

    // Prepare waypoints for origins
    const wayPointsOrigin = originStops.map((stop: any) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: stop.lat,
            longitude: stop.long,
          },
        },
      },
      routeModifiers: {
        tollPasses: ['AU_ETOLL_TAG', 'AU_EWAY_TAG', 'AU_LINKT', 'IN_FASTAG'],
      },
    }));

    // Prepare waypoints for destinations
    const wayPointsDest = destinationStops.map((stop: any) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: stop.lat,
            longitude: stop.long,
          },
        },
      },
    }));
    console.log("wayPointsOrigin", wayPointsOrigin[0].waypoint.location);
    console.log("wayPointsDest", wayPointsDest[0].waypoint.location);


    // Data for API request
    const data = {
      origins: wayPointsOrigin,
      destinations: wayPointsDest,
      travelMode: 'DRIVE',
      extraComputations: ['TOLLS'],
    };

    try {
      // Call API to fetch toll charges
      console.log("data", data);

      const response = await this.getTollCharges(data);
      console.log("response", response);

      if (Array.isArray(response)) {
        const tollCharges = this.calculateTollCharges(response);
        return tollCharges;
      }

      return null;
    } catch (error) {
      throw new HttpException('Failed to calculate toll charges', error);
    }
  }



  private calculateTollCharges(responseList: any[]): number | null {
    const pricesList: string[] = [];

    responseList.forEach((item) => {
      const price = item?.travelAdvisory?.tollInfo?.estimatedPrice?.[0]?.units;
      if (price) pricesList.push(price);
    });

    if (pricesList.length > 0) {
      const totalToll = pricesList.reduce((sum, price) => sum + parseFloat(price), 0);
      return totalToll;
    }

    return null;
  }

  async generateOtp() {
    try {
      return 1234;
      return Math.floor(1000 + Math.random() * 9000);
    } catch (error) {
      throw error;
    }
  }

}
