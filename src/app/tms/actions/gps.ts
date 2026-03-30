'use server';

const API_BASE = 'http://app.aika168.com:8088/openapiv3.asmx';
const APP_KEY = '7DU2DJFDR8321';

function parseXmlResponse(xmlText: string) {
  const match = xmlText.match(/>({.*})<\/string>/s);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Failed to parse inner JSON', e);
      return null;
    }
  }
  return null;
}

export async function getVehicleTracking(imei: string, pass: string = '123456') {
  try {
    // 1. Login to get device ID and key
    const loginPayload = new URLSearchParams({
      Name: imei,
      Pass: pass,
      LoginType: '1',
      LoginAPP: 'AKSH',
      GMT: '8:00',
      Key: APP_KEY
    });

    const loginRes = await fetch(`${API_BASE}/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginPayload.toString(),
      cache: 'no-store'
    });

    const loginText = await loginRes.text();
    const loginData = parseXmlResponse(loginText);

    if (!loginData || loginData.state !== '0' || !loginData.deviceInfo) {
      return { success: false, error: 'Failed to login to GPS service' };
    }

    const { deviceID, model, key2018 } = loginData.deviceInfo;

    // 2. Get Tracking
    const trackingPayload = new URLSearchParams({
      DeviceID: deviceID,
      Model: model,
      TimeZones: '8:00',
      MapType: 'Google',
      Language: 'en',
      Key: key2018
    });

    const trackingRes = await fetch(`${API_BASE}/GetTracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: trackingPayload.toString(),
      cache: 'no-store'
    });

    const trackingText = await trackingRes.text();
    const trackingData = parseXmlResponse(trackingText);

    if (!trackingData || trackingData.state !== '0') {
      return { success: false, error: 'Failed to get tracking data' };
    }

    return {
      success: true,
      data: {
        lat: parseFloat(trackingData.lat),
        lng: parseFloat(trackingData.lng),
        speed: parseFloat(trackingData.speed),
        positionTime: trackingData.positionTime,
        status: trackingData.status,
        isStop: trackingData.isStop === '1'
      }
    };
  } catch (error) {
    console.error('GPS tracking error:', error);
    return { success: false, error: 'Internal error while fetching GPS tracking' };
  }
}

export async function getVehicleHistory(imei: string, startTime: string, endTime: string, pass: string = '123456') {
  try {
    const loginPayload = new URLSearchParams({
      Name: imei,
      Pass: pass,
      LoginType: '1',
      LoginAPP: 'AKSH',
      GMT: '8:00',
      Key: APP_KEY
    });

    const loginRes = await fetch(`${API_BASE}/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginPayload.toString(),
      cache: 'no-store'
    });

    const loginText = await loginRes.text();
    const loginData = parseXmlResponse(loginText);

    if (!loginData || loginData.state !== '0' || !loginData.deviceInfo) {
      return { success: false, error: 'Failed to login to GPS service' };
    }

    const { deviceID, model, key2018 } = loginData.deviceInfo;

    const histPayload = new URLSearchParams({
      DeviceID: deviceID,
      Model: model,
      TimeZones: '8:00',
      MapType: 'Google',
      Language: 'en',
      Key: key2018 || APP_KEY,
      StartTime: startTime, // 'yyyy-MM-dd HH:mm:ss'
      EndTime: endTime, // 'yyyy-MM-dd HH:mm:ss'
      ShowLBS: '0',
      SelectCount: '1000'
    });

    const res = await fetch(`${API_BASE}/GetDevicesHistory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: histPayload.toString(),
      cache: 'no-store'
    });

    const text = await res.text();
    const data = parseXmlResponse(text);

    if (!data || data.state !== '0' || !data.devices) {
      return { success: false, error: 'Failed to get history data' };
    }

    const points = data.devices.map((d: any) => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lng),
      speed: parseFloat(d.speed),
      positionTime: d.deviceUtcDate || d.positionTime
    })).filter((d: any) => !isNaN(d.lat) && !isNaN(d.lng));

    return {
      success: true,
      data: points
    };

  } catch (error) {
    console.error('GPS history error:', error);
    return { success: false, error: 'Internal error while fetching GPS history' };
  }
}
