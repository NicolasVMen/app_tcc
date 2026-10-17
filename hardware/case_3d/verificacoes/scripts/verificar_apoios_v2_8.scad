// Executar com -D part="validation": o conjunto principal nao e gerado.
include <../../escolta_case_v2.scad>;

check = "support_contact";

if (check == "support_contact") {
    // Corpo real informado pelo usuario: 6 x 6 x 4 mm, com atuador de 1 mm.
    // O contato plano e eliminado por 0,01 mm, nao uma interferencia volumetrica.
    intersection() {
        button_lower_supports();
        translate([button_center_x - 3, button_center_y - 3,
            -button_seat_depth + 0.01]) cube([6, 6, button_body_height]);
    }
} else if (check == "support_view") {
    // Alojam. sem componentes: permite ver os apoios integrados na base do U.
    color([0.22, 0.60, 0.82]) button_pocket();
}
