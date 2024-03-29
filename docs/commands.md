# Philips Air Commands

| Command  | Description                  | Type    | Values                                      |
|----------|------------------------------|---------|---------------------------------------------|
| aqil     | Air quality index light      | number  | 100                                         |
| cl       | Child lock                   | boolean | true, false                                 |
| dt       | Day timer                    | number  | 0                                           |
| func     | Function                     | string  | P(urification), H(umidification), PH (both) |
| mode     | Mode                         | string  | M(anual), A(uto), T(urbo), S(leep)          |
| om       | Fan speed                    | string  | 1,2,3                                       |
| pwr      | Power                        | string  | 0 (off), 1 (on)                             |
| rhset    | Target humidity              | number  | 40, 50, 60, 70                              |
| uil      | Buttons light                | string  | 0 (off), 1 (on)                             |

# Philips Air Status fields

| Status   | Description                  | Type    | Values                                      |
|----------|------------------------------|---------|---------------------------------------------|
| aqil     | Air quality index light      | number  | 100                                         |
| aqit     | Air quality index threshold  | number  |                                             |
| aqit_ext |                              | number  |                                             |
| cl       | Child lock                   | boolean | true, false                                 |
| ddp      | Used index                   | string  | 0 (IAI), 1 (PM2.5), 3 (Humidity)            |
| dt       | Day timer                    | number  | 0                                           |
| dtrs     |                              | number  | 0                                           |
| err      |                              | number  |                                             |
| fltsts0  | Pre-filter cleaning (hours)  | number  |                                             |
| fltsts1  | HEPA filter replace (hours)  | number  |                                             |
| fltsts2  | AC filter replace (hours)    | number  |                                             |
| fltt1    | HEPA filter type             | string  | A3                                          |
| fltt2    | Active Carbon (AC) filter    | string  | C7                                          |
| func     | Function                     | string  | P(urification), H(umidification), PH (both) |
| iaql     | Allergen index               | number  |                                             |
| mode     | Mode                         | string  | M(anual), A(uto), T(urbo), S(leep)          |
| om       | Fan speed                    | string  | 1,2,3                                       |
| pm25     | PM25                         | number  |                                             |
| pwr      | Power                        | string  | 0 (off), 1 (on)                             |
| rddp     |                              | string  |                                             |
| rh       | Humidity                     | number  |                                             |
| rhset    | Target humidity              | number  | 40, 50, 60, 70                              |
| temp     | Temperature                  | number  |                                             |
| uil      | Buttons light                | string  | 0 (off), 1 (on)                             |
| wicksts  | Wick filter replace (hours)  | number  |                                             |
| wl       | Water level                  | number  | 0 (empty), 100 (filled)                     |

# Error codes

| Error    | Description                  |
|----------|------------------------------|
| 32768    | Water tank open              |
| 49155    | Clean pre-filter             |
| 49184    | Clean wick filter            |
| 49408    | Water tank empty             | 
 