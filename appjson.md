{
  "expo": {
    "name": "sabino-mobile-app",
    "slug": "sabino-mobile-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/file_00000000587c71f49e259302058eceae (1).png",
    "scheme": "sabinomobileapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.courteous.sabinomobile",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.courteous.sabinomobile",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/file_00000000587c71f49e259302058eceae (1).png",
        "backgroundImage": "./assets/images/file_00000000587c71f49e259302058eceae (1).png",
        "monochromeImage": "./assets/images/file_00000000587c71f49e259302058eceae (1).png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-font",
      "expo-secure-store",
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "d21da891-6ad0-487f-8177-ef1c44334aa9"
      }
    }
  }
}


