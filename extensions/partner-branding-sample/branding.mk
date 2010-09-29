# Partner sample branding; redefine certain things here...

DISTRIBUTION_ID = PartnerId
DISTRIBUTION_VERSION = 1.0.$(SB_BUILD_NUMBER)

DISTRIBUTION_ABOUT = Partner About String
DISTRIBUTION_ABOUT_EN_US = Localized Partner (en-US) About String

SB_BRAND_SHORT_NAME  = PartnerPlayer
SB_BRAND_FULL_NAME   = Partner Media Player
SB_BRAND_VENDOR_NAME = PartnerCo, Inc.
SB_BRAND_TRADEMARKS  = \
  Partner Media Player and Partner Name are registered trademarks of \
  PartnerCo, Inc.  Mozilla is a registered trademark of the Mozilla \
  Foundation. XULRunner is a trademark of the Mozilla Foundation.

SB_INSTALLER_ABOUT_URL=http://www.example.com/
SB_INSTALLER_UPDATE_URL=http://example.com/
SB_CRASHREPORT_SERVER_URL=https://crashreports.songbirdnest.com/submit
SB_APP_BUNDLE_BASENAME=com.example

DISTRIBUTION_APP_STUB = PartnerName.exe
DISTRIBUTION_APP_STUB_COMMENTS = $(SB_BRAND_FULL_NAME) is based on The Mozilla Xulrunner Stub loader.
DISTRIBUTION_APP_ICON = partnername.ico
DISTRIBUTION_APP_ICON_MAC = partnername.icns
DISTRIBUTION_PROFILE_NAME = $(SB_BRAND_SHORT_NAME)

DISTRIBUTION_DEFINES += \
   -DDISTRIBUTION_ID="$(DISTRIBUTION_ID)" \
   -DDISTRIBUTION_VERSION="$(DISTRIBUTION_VERSION)" \
   -DDISTRIBUTION_ABOUT="$(DISTRIBUTION_ABOUT)" \
   -DDISTRIBUTION_ABOUT_EN_US="$(DISTRIBUTION_ABOUT_EN_US)" \
   -DDISTRIBUTION_APP_STUB="$(DISTRIBUTION_APP_STUB)" \
   -DDISTRIBUTION_APP_STUB_COMMENTS="$(DISTRIBUTION_APP_STUB_COMMENTS)" \
   -DDISTRIBUTION_APP_ICON="$(DISTRIBUTION_APP_ICON)" \
   -DDISTRIBUTION_APP_ICON_MAC="$(DISTRIBUTION_APP_ICON_MAC)" \
   $(NULL)

SB_BRANDING_DEFINES += \
   -DSB_BRAND_SHORT_NAME="$(SB_BRAND_SHORT_NAME)" \
   -DSB_BRAND_FULL_NAME="$(SB_BRAND_FULL_NAME)" \
   -DSB_BRAND_VENDOR_NAME="$(SB_BRAND_VENDOR_NAME)" \
   -DSB_VENDOR="$(SB_BRAND_VENDOR_NAME)" \
   -DSB_TRADEMARKS="$(SB_BRAND_TRADEMARKS)" \
   -DSB_INSTALLER_ABOUT_URL="$(SB_INSTALLER_ABOUT_URL)" \
   -DSB_INSTALLER_UPDATE_URL="$(SB_INSTALLER_UPDATE_URL)" \
   -DSB_CRASHREPORT_SERVER_URL="$(SB_CRASHREPORT_SERVER_URL)" \
   -DSB_APP_BUNDLE_BASENAME="$(SB_APP_BUNDLE_BASENAME)" \
   $(NULL)

