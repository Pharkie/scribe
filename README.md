# Project Scribe

Here's a cool little networked thermal printer for printing whatever you like.

## 🛠️ This fork by Pharkie

This fork includes the following changes on top of the original repo:

- **ESP32-C3 support** - Changed from the from ESP8266 D1 Mini to ESP32-C3 with
  GPIO20/21 pins. Uses hardware serial not software, unlike the original.
- **Configuration centralization** - All settings e.g. wifi password moved to
  `src/config.h`, where they can be kept out of the Git repo (.gitignore)
- **mDNS integration** - Device accessible at http://scribe.local, as well as IP
  address.
- **Automatic timezone handling** - timezone handling inc automatic daylight
  savings and improved date handling elsewhere via the ezTime library.
- **Enhanced robustness** - new text wrapping algorithm, WiFi reconnection,
  watchdog timer, status monitoring at /status.
- **Improved UI** - You can write on receipt after another more easily, now.
- **Fun buttons** - Added a Random Riddle button, plus Character test and System
  status.

I've modified the below to reflect these changes, and it's now a mix of the
original and my changes.

All credit to UrbanCircles for the original concept, 3D model and original code.
Have fun, makers!

Gotchas:

I could not power the Cashino CSN-A4L via USB, whatever cable or supply I used.
It appears you can ONLY power the printer via the 3 pin (2 pins used) "POWER"
connector, and then USB could perhaps be used for serial. I didn't investigate
that, because we use the TTL 5-pin connection instead which, just to be clear,
does not provide power (but it does reference ground).

When you first get the printer, you want to check it works, right? Hold down the
front (only) button as you power on the printer to do a self test. i.e. hold the
button and attach 5V power to the POWER 3 pin (2 pins used) connector (I did
this using a bench power supply and crocodile clips).

---

## Setup Instructions for PlatformIO

### 1. Configuration Setup

Before building the project, you need to create your configuration file:

1. Copy `src/config.h.example` to `src/config.h`
2. Edit `src/config.h` with your WiFi credentials and settings
3. The `config.h` file is ignored by git to keep your credentials safe

```bash
cp src/config.h.example src/config.h
# Edit src/config.h with your WiFi credentials
```

### 2. Build and Upload

```bash
pio run                    # Build the project
pio run --target upload    # Upload to ESP32-C3
pio device monitor         # Monitor serial output
```

> [!TIP]  
> This is the base configuration of Scribe, to serve one straight forward,
> important use case: it turns the Scribe platform into a simple and reliable
> short message writer (simple by design). It works very well as is.
>
> However, if you wish, you can go beyond this and make this human-machine/
> human-computer interface truly your own.
>
> The hardware is capable, the design is easily adaptable, and the firmware is
> easy to develop/ scale in whichever direction your imagination leads you
> towards! I'm excited to see what you come up with!

Base Scribe: a simple, reliable, open-source system that helps you capture the
meaningful moments of your life. It leverages thermal printing to write a
tangible log of your life's story, daily achievements, thoughts, or memories on
a continuous roll of paper. It's designed to be a quiet companion that nudges
you to live more intentionally.

This project is born from the idea of "bringing receipts" for the life you lead/
towards the life you want to lead. It's about creating a physical artifact of
your journey. It is highly hackable, adaptable and scalable to fit your needs
and wants.

## Features of the "out-of-the-box" configuration (v1)

- **Thermal Printing:** Clean, permanent-enough tactile records - no mess, no
  dried ink
- **Standard Rolls:** Very cheap and available paper - e.g. couple of bucks for
  6 rolls
- **Minimalist Web Interface:** Sleek, distraction-free input with just a text
  box and submit button (and some confetti for that extra delight)
- **API Integration:** Integrate Project Scribe with your favourite tools like
  Apple Shortcuts, IFTTT, or your own custom scripts.
- **Offline Operation:** No cloud services required (but cloud capable) -
  everything works locally
- **Organic Design:** Loosely Inspired by Dalí and Gaudí, with flowing curves
  that hint at life's organic nature
- **Low Power:** Runs on a single USB port, no separate power supply needed
  (about 0.5W at idle)
- **Open Source:** Completely free, hackable, and customisable

![pic for profiles](https://github.com/user-attachments/assets/56afd51b-3560-419a-93f4-af315ba2968f)

## BOM

- ESP32-C3 MCU board (other ESP32 boards may work with pin adjustments)
- CSN-A4L thermal printer (other serial thermal printers might work)
- Paper rolls (printer comes preloaded with one, and it'll last ages. You're
  looking for 57.5±0.5mm width and 30mm max diameter)
- 3D printer for the body (you may need some glue to fix the parts together - no
  screws required)
- Wires (for soldering and connecting components + USB wire to power the whole
  thing)
- 5V/ USB power supply capable of higher currents (only used during thermal
  printing)

Links to the 3D printed component files can be found in the
[Assembly](#assembly) section contains.

If you don't have a 3D printer but would like to build this, consider using the
PCBWay affiliate link: https://pcbway.com/g/86cN6v (discount to you + some small
help for the project).

### Affiliate links for the components

If you're so inclined, feel free to use the following affiliate links. They help
out the project :)

> [!NOTE] The components might be slightly different as listings always change
> silently - always check. If you notice any issues, please ping me to update
> the readme.

| Component                         | Amazon US               | Amazon UK               | AliExpress                                |
| --------------------------------- | ----------------------- | ----------------------- | ----------------------------------------- |
| Microcontroller (ESP32-C3)        |                         |                         | -                                         |
| Thermal Printer (CSN-A4L)         | https://amzn.to/4kr5ksq | -                       | https://s.click.aliexpress.com/e/_opjoNrw |
| Paper Rolls, BPA-free (57.5x30mm) | https://amzn.to/4kpOREP | https://amzn.to/44nqGCg | -                                         |

> [!IMPORTANT] Do your own due diligence regarding thermal paper types - the
> thermal paper we handle everyday (e.g. through receipts from the grocery
> store, restaurants, takeaway, taxis, etc.) will contain BPA. When choosing
> your rolls for this, you should definitely go for BPA-free paper just to be on
> the safer side - the links provided are for BPA-free paper. If you can, go a
> step further and look for "phenol-free" paper. Three types that do not contain
> BPA or BPS and are competitively priced contain either ascorbic acid (vitamin
> C), urea-based Pergafast 201, or a technology without developers, Blue4est.

> [!NOTE] Some thermal paper is treated against fading - can last e.g. 35+
> years. If you're planning on using Scribe for archival purposes, consider ink
> fading when picking up the right rolls.

## Pin-out/ wiring during operation

The project uses UART1 to communicate with the printer on the ESP32-C3.

| Printer Pin | ESP32-C3 Pin | Power Supply Pin | Description   |
| ----------- | ------------ | ---------------- | ------------- |
| TTL RX      | GPIO20       | -                | MCU Transmit  |
| TTL TX      | GPIO21       | -                | MCU Receive   |
| TTL GND     | GND          | GND              | Common Ground |
| Power VH    | -            | 5V               | Printer VIN   |
| Power GND   | GND          | GND              | Printer GND   |

Wires not listed in the table (e.g. TTL NC/ DTR) are unused andcan be removed.
Fewer wires => less clutter which is hugely helpful.

> [!IMPORTANT] Never power the printer directly from/ through the ESP32-C3, you
> may burn your microcontroller.
>
> **Only power the ESP32-C3 via one source** - either via USB during firmware
> flashing, or via the 5V pin during normal operation from the shared power
> supply.

## Microcontroller firmware

### Configuration

All configuration is handled in `src/config.h` after copying from
`src/config.h.example`. This includes:

- WiFi credentials (SSID and password)
- Timezone settings (automatically handles DST with ezTime library)
- mDNS hostname (default: "scribe" for http://scribe.local access)
- Character limits and other preferences

### Development Environment

**Recommended:** VS Code with PlatformIO extension for the best development
experience:

1. Install [VS Code](https://code.visualstudio.com/)
2. Install the [PlatformIO IDE extension](https://platformio.org/platformio-ide)
3. Open the project folder in VS Code
4. PlatformIO will automatically handle dependencies and board configuration

**Alternative:** You can also use the
[Arduino IDE](https://www.arduino.cc/en/software/) with ESP32 board support,
though PlatformIO is recommended.

Ensure that everything is working **before** soldering, and squeezing your
components into the 3D printed shell!

> [IMPORTANT!] As mentioned above - do not power the printer through the
> ESP32-C3 and do not power the ESP32-C3 via both the USB and its pins at the
> same time.

## Assembly

In each set, there are 2x 3D Printed components:

- The head unit (in which your MCU + Thermal Printer + wiring slot it)
- The neck/ leg (connects with the head and has a channel to elegantly route/
  feed your power cable through)

The printed components can be found on either the
[Maker World](https://makerworld.com/en/models/1577165-project-scribe#profileId-1670812)
page, or the
[Printables](https://www.printables.com/model/1346462-project-scribe/files) page

**Printing considerations**

- The head has fillets, so you may need supports
- Smaller line heights will produce better results
- The neck/ leg can be printed without any supports upright
- The components may vary in size slightly, so will the tolerances/ clearances -
  you may need to us glue to put the pieces together in case they're lose, or
  sandpaper in case they're too tight

**Assembly considerations**

- Make sure you route the wire through the neck/ leg of Scribe before you crimp
  the connectors
- Important: make sure each connection and wire is well isolated before you cram
  all the wiring into the head unit! You really don't want a short circuit
- Always to a test run before final assembly
- Do not glue the electrical components together, in case you need to service
  this later (you shouldn't need to glue them together)

## User guide for standard configuration (v1)

1. **Power On:** Connect the device to a beefy (2.4A+) 5V USB power source. Wait
   a few moments for it to boot, connect to WiFi, and print its startup receipt.
2. **Access the Interface:** Open http://scribe.local in your browser (or use
   the IP address from the startup receipt if mDNS doesn't work).
3. **Start Scribing!**
4. **Look back at your story**
5. **Improve and scribe some more**

**Message format** The as-is firmware prints messages in the right orientation
for the roll of paper to naturally wind downwards, with word wrap. The first
line is the header, reminiscent of a calendar - date on black background. The
following lines are the message itself.

**Scribing through a web browser**

- The ESP32-C3 creates a local web server and the as-is configuration includes a
  minimalist, light web app
- Open a web browser on any device on the same network and navigate to
  `http://scribe.local` (or `http://<IP_ADDRESS>`). Type your entry (up to 200
  characters) and press Enter or click the "Send" button.
- This limitation is not the limitation of the printer/ hardware/ system, I just
  like it to keep the messages concise - you can change it in firmware (just
  like everything else around here)

**Scribing through the API**

- You can also send entries directly from a browser or script. For example:
  `http://scribe.local/submit?message=Went%20for%20a%20hike`
- This is particularly useful when running automations - it works straight out
  of the box
- Different to the web app, when using the API there is no character limit out
  of the box. In addition, you can also backdate your entries, by adding the
  `date` parameter:
  `http://scribe.local/submit?message=Finished%20the%20book&date=2025-07-04`

## Beyond the as-is: Ideas to Extend or Replace the As-Is Functionality

The combination of a WiFi-enabled MCU, a Thermal Printer and an API-ready web
server makes Scribe a powerful platform for all sorts of creative projects.

You can easily adapt the existing code to create a completely new experience.
Here are a few ideas to get you started:

- **Daily Briefing Printer:** Modify the code to fetch data from public APIs
  every morning. It could print:
  - Your first few calendar events for the day.
  - The local weather forecast.
  - A curated news headline from an RSS feed.
  - The word or quote of the day.
- **Task & Issue Tracker:** Connect it to your productivity tools (like Todoist,
  Jira, or GitHub) via their APIs or webhooks.
  - Print new tasks or tickets as they are assigned to you.
  - Print your most important tasks for the day each morning.
- **Kitchen Companion:** Place it in your kitchen to print:
  - Shopping lists sent from a family messaging app or a shared note.
  - A recipe of the day.
  - Measurement conversion charts on demand.
- **Tiny Message Receiver:** Create a unique, private messaging system. Family
  members could send short messages to the printer from anywhere, creating a
  physical message board.
- **Daily Dose of Fun:** Make it a source of daily delight by having it print:
  - A random joke or comic strip (like XKCD).
  - A "shower thought" from a Reddit subreddit.
  - A custom fortune cookie message.
- **Photo Booth Printer:** Extend the functionality to accept an image URL via
  the API, dither the image in the firmware, and print low-resolution, stylised
  versions of your photos.

## Troubleshooting

In my testing and usage, I found this setup to be extremely reliable (after all,
these printers are used in commercial settings). If the device is not printing
as expected, this may be because of several reasons, e.g.:

- incorrect wiring/ a short
- paper not inserted correctly
- current on offer is not high enough

Thermal Printer Manual, in case you need to look into things further:
https://www.manualslib.com/manual/3035820/Cashino-Csn-A4l.html

## Credits and Acknowledgments

### Riddles Collection

The riddles feature uses a collection of riddles curated by **Nikhil Mohite**
from the [riddles-api](https://github.com/nkilm/riddles-api) project. This
collection is provided under the MIT License.

- **Original Repository:** https://github.com/nkilm/riddles-api
- **Author:** Nikhil Mohite
- **License:** MIT License

We thank Nikhil for making this wonderful collection of riddles available to the
open source community.

### Original Project

All credit to **UrbanCircles** for the original Project Scribe concept, 3D
model, and initial codebase that made this ESP32-C3 thermal printer possible.

## Disclaimer

I've done my best to document everything accurately - however, there might be
mistakes. If you see them, or opportunities to improve, please open an issue.  
This is an open-source project given for free, with no warranties or guarantees.
It assumes a level of proficiency with electronics, assemblies, engineering,
etc. Do your own due diligence - it's your responsibility. Stay safe. Stay
productive. Work with what you have. Make the world a better place.
