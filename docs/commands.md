# Philips Air Commands

|----------|------------------------------|---------|---------------------------------------------|
| Command  | Description                  | Type    | Values                                      |
|----------|------------------------------|---------|---------------------------------------------|
| cl       | Child lock                   | boolean | true, false                                 |
| func     | Function                     | string  | P(urification), H(umidification), PH (both) |
| mode     | Mode                         | string  | M(anual), A(uto), T(urbo), S(leep)          |
| om       | Fan speed                    | string  | 1,2,3                                       |
| pwr      | Power                        | string  | 0 (off), 1 (on)                             |
| rhset    | Target humidity              | number  | 20, 40, 60                                  |
| uil      | Buttons light                | string  | 0 (off), 1 (on)                             |
|----------|------------------------------|---------|---------------------------------------------|

# Philips Air Status fields

|----------|------------------------------|---------|---------------------------------------------|
| Status   | Description                  | Type    | Values                                      |
|----------|------------------------------|---------|---------------------------------------------|
| aqil     | Air quality index light      | number  | 100                                         |
| aqit     | Air quality index threshold  | number  |                                             |
| aqit_ext |                              | number  |                                             |
| cl       | Child lock                   | boolean | true, false                                 |
| ddp      |                              | string  |                                             |
| dt       |                              | number  | 0                                           |
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
| rhset    | Target humidity              | number  | 20, 40, 60                                  |
| temp     | Temperature                  | number  |                                             |
| uil      | Buttons light                | string  | 0 (off), 1 (on)                             |
| wicksts  | Wick filter replace (hours)  | number  |                                             |
| wl       | Water level                  | number  |                                             |
|----------|------------------------------|---------|---------------------------------------------|