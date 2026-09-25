// Teste: resultado VAZIO significa ausencia das interferencias verificadas.
include <escolta_case_v2.scad>
part = "validation";
eps = 0.02;
assert(battery_length + 2 * battery_clearance == 24);
assert(battery_width + 2 * battery_clearance == 17.5);
assert(battery_tray_y - review_tie_thickness > wall);
assert(connector_y - 2 > battery_tray_y + battery_tray_width + review_tie_thickness);
intersection() {
    base();
    union() {
        // Alojamento completo, nao so o corpo nominal da bateria.
        translate([battery_x - battery_clearance + eps,
            battery_y - battery_clearance + eps, battery_bottom_z + eps])
            cube([battery_length + 2 * battery_clearance - 2*eps,
                battery_width + 2 * battery_clearance - 2*eps, battery_height]);
        translate([connector_x + eps, connector_y + eps, connector_bottom_z + eps])
            cube([connector_length - 2*eps, connector_width - 2*eps, connector_height]);
        translate([wire_bundle_x + eps, wire_bundle_y + eps, wire_bundle_bottom_z + eps])
            cube([wire_bundle_length - 2*eps, wire_bundle_width - 2*eps,
                wire_bundle_height - 2*eps]);
        // Canal sob a bateria e ambos os acessos para passar a fita.
        translate([battery_x + battery_length / 2 - review_slot_width / 2 + eps,
            battery_tray_y - review_tie_thickness + eps, floor_thickness + 0.2 + eps])
            cube([review_slot_width - 2*eps,
                battery_tray_width + 2*review_tie_thickness - 2*eps,
                review_slot_height - 2*eps]);
    }
}
