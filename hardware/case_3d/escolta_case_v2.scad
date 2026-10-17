// ============================================================================
// ESCOLTA UNITAU - Caixa vestivel V2.8 (apoios inferiores do botao)
// XIAO apoiada na borda longa, face dos componentes voltada para a parede.
// Unidades: milimetros
// ============================================================================

$fn = 56;
// A camera fica livre para giro, zoom e enquadramento pelo OpenSCAD.
// Nao fixe $vpr/$vpt/$vpd aqui: isso redefine a vista a cada F5.

// Abra este arquivo e pressione F5. "assembly" mostra o conjunto completo;
// "layout" esconde a tampa; as demais opcoes geram as pecas para impressao.
part = "button_detail"; // [assembly,layout,battery_detail,tie_detail,buzzer_detail,button_detail,exploded,lid_top,base,lid,button_cap,button_retainer,button_set,closure_interference]
show_components = true;
show_battery_demo = true;

// Dimensoes de referencia antigas mantidas para ilustracoes da V2.3.
// Os passantes revisados usam review_slot_width/height abaixo.
tie_width = 2.5;
tie_thickness = 1.0;
tie_slot_width = 3.1;
tie_slot_height = 1.5;

// Revisao parcial de 23/09: item 1 do retorno da impressao.
// Buzzer, XIAO, bateria e conector: abertura nominal 6 x 3 mm.
// A cinta comum e de 2,5 mm; o furo permanece grande para compensar a
// perda dimensional da impressora. A cabeca fica fora da passagem.
review_slot_width = 6;
review_slot_height = 3;
review_tie_width = 2.5;
review_tie_thickness = 1.5;
xiao_slot_width = 7.2;
xiao_slot_height = 3.6;
xiao_tie_width = 3.6;
anchor_wall = 1.2;

// ----------------------------- Corpo da caixa -------------------------------
outer_length = 61;
outer_width = 46;
base_height = 28;
wall = 2;
floor_thickness = 2;
corner_radius = 5;

lid_thickness = 2.4;
lid_rim_depth = 2;
lid_rim_thickness = 1.2;
lid_clearance = 0.4;

// Passantes da pulseira.
strap_slot_length = 22;
strap_slot_width = 2.8;
strap_lug_extension = 5.5;
strap_lug_overlap = 0.8;
strap_lug_height = 4.5;

// --------------------------- Parafusos da tampa -----------------------------
// Quatro parafusos simetricos: 6 mm das laterais e 4 mm das bordas curtas.
screw_positions = [
    [6, 4],
    [55, 4],
    [6, 42],
    [55, 42]
];
screw_boss_diameter = 6.2;
screw_pilot_diameter = 1.7;
screw_lid_clearance = 2.4;
screw_head_diameter = 4.6;
screw_head_depth = 1.2;

// ------------------------------- XIAO ----------------------------------------
// A placa fica sobre a borda longa: comprimento no eixo Y, largura no eixo Z.
// A face dos componentes olha para X = 0. A placa foi deslocada para dentro
// apenas o necessario para liberar o parafuso do canto frontal esquerdo.
xiao_board_x = 13;
xiao_front_y = 2.1;
xiao_length = 21;
xiao_height = 17.8;
xiao_board_thickness = 1.6;
xiao_component_depth = 2.7;
xiao_bottom_z = 6.6;
xiao_tie_y = xiao_front_y + 2 + 2.54 * 4.5 - 0.3;
xiao_antenna_start_y = xiao_front_y + 16;
// Medida do conjunto soldado informada em 24/09: 13 mm da face da placa
// ate a ponta mais distante dos pinos. Comprimento total com USB-C: 22 mm.
xiao_depth_to_pin_tip = 13;
xiao_total_length_with_usb = 22;
xiao_guard_width_y = 4.2;
xiao_guard_thickness = 3;
xiao_guard_clearance = 0.8;
xiao_guard_base_margin = 2;
xiao_guard_base_top_z = 6.5;
xiao_front_guard_x = xiao_board_x - xiao_component_depth
    - xiao_guard_clearance - xiao_guard_thickness;
xiao_rear_guard_x = xiao_board_x + xiao_board_thickness
    + xiao_guard_clearance;
xiao_anchor_x = xiao_front_guard_x - 0.1;
xiao_anchor_length = xiao_rear_guard_x + xiao_guard_thickness
    - xiao_anchor_x + 0.1;
xiao_guard_top_z = xiao_bottom_z + xiao_height + 0.8;

// USB-C na parede frontal (Y = 0). A placa na borda deixa o conector "em pe".
// Medida real confirmada em 24/09: 9 x 3 mm. Como a XIAO esta apoiada de
// lado, os 9 mm ficam no eixo Z e os 3 mm no eixo X da abertura frontal.
usb_connector_major = 9;
usb_connector_minor = 3;
usb_opening_center_x = 13.5;
usb_opening_width = 5.4;
usb_opening_bottom = 10.1;
usb_opening_height = 10.5;

// Janela reposicionada conforme a marcacao na prova impressa de 30/09:
// abaixo e a direita da USB-C na mesma parede frontal. A abertura circular
// deixa 0,8 mm de material ate a aresta inferior da janela USB-C.
xiao_led_window_center_x = 16.7;
xiao_led_window_center_z = 8.1;
xiao_led_window_diameter = 2.4;

// ------------------------- Buzzer e bloco de fios ---------------------------
// O tucho medido pelo usuario fica sob a prateleira do buzzer.
wire_bundle_x = 2.4;
wire_bundle_y = 24.5;
wire_bundle_length = 30;
wire_bundle_width = 15;
wire_bundle_height = 10.7;
wire_bundle_bottom_z = floor_thickness + 0.3;

buzzer_axis_start_x = 11.2;
buzzer_center_y = 32.8;
buzzer_center_z = 19.5;
buzzer_diameter = 12;
buzzer_length = 9;
buzzer_shelf_z = 13.3;
buzzer_shelf_thickness = 1.4;
buzzer_hole_diameter = 1.8;
buzzer_hole_pattern_radius = 3.2;

// ------------------------------ Bateria --------------------------------------
// A bateria fica centralizada no eixo Y da caixa, no sentido indicado na
// vista superior. Em X permanece perto da parede direita, com saida de fios.
battery_x = 34.5;
battery_y = 15.8;
battery_length = 21;
battery_width = 14.5;
battery_height = 5;
battery_clearance = 1.5;
battery_underpass = 3.2;
battery_deck_thickness = 2;
battery_bottom_z = floor_thickness + battery_underpass + battery_deck_thickness;
battery_rail = 1.6;
battery_lip_height = 2.5;
battery_tray_x = battery_x - battery_clearance - battery_rail;
battery_tray_y = battery_y - battery_clearance - battery_rail;
battery_tray_length = battery_length + 2 * (battery_clearance + battery_rail);
battery_tray_width = battery_width + 2 * (battery_clearance + battery_rail);
battery_wire_gap = 6;

// Conector branco completo, ilustrado solto sobre o piso.
connector_x = 34;
connector_y = 35;
connector_length = 15;
connector_width = 7;
connector_height = 4.5;
connector_bottom_z = floor_thickness;

// ------------------------------- Botao ---------------------------------------
button_center_x = 47;
button_center_y = 35;
button_body = 5.5;
button_body_height = 4;
button_actuator_height = 1;
// A prova impressa mostrou que o corpo real e o prolongador precisam de
// 0,8 mm adicionais. A folga de repouso deixa o atuador livre ao fechar.
button_body_top_gap = 4.6;
button_rest_gap = 0.5;
button_pocket_clearance = 0.45;
button_plunger_hole = 4.8;
// O topo dos apoios, nao a face inferior deles, define onde o botao assenta.
// Mantem o corpo em -8,6 mm e a folga aprovada de 0,5 mm sobre o atuador.
button_seat_depth = button_body_height + button_body_top_gap;
button_support_thickness = 1.8;
button_support_lip = 1.2;
button_pocket_wall = 1.4;
button_pocket_total_depth = button_seat_depth + button_support_thickness;

cap_head_diameter = 9;
cap_head_height = 2.2;
// Curso externo de 1,0 mm: 0,5 mm ate tocar o botao e 0,5 mm para acioná-lo.
cap_head_rest_gap = 1.0;
cap_stem_diameter = 4.2;
// Montagem pela tampa: haste -> canal da trava -> pino de contato.
// A haste entra pelo lado externo e a trava em C e instalada pelo lado interno.
cap_through_length = lid_thickness + cap_head_rest_gap;
cap_groove_diameter = 3.2;
cap_groove_height = 2.1;
// Ombro inferior menor que o furo: atravessa a tampa durante a montagem, mas
// impede a trava de escorregar para o pino de contato depois de encaixada.
cap_lower_shoulder_diameter = 4.2;
cap_lower_shoulder_height = 0.5;
cap_contact_diameter = 3;
cap_contact_height = button_body_top_gap
    - button_actuator_height
    - cap_groove_height
    - cap_lower_shoulder_height
    - button_rest_gap;
cap_stem_length = cap_through_length
    + cap_groove_height
    + cap_lower_shoulder_height
    + cap_contact_height;

retainer_outer_diameter = 5.6;
retainer_inner_diameter = 3.6;
retainer_height = 1;
retainer_slot_throat_width = 2.9;
retainer_slot_mouth_width = 3.8;
retainer_axial_clearance = cap_groove_height - retainer_height;
groove_to_button_tip = button_body_top_gap - button_actuator_height
    - cap_groove_height;

assert(cap_contact_height > 0,
    "O pino de contato desapareceu: revise as alturas do conjunto do botao.");
assert(button_support_thickness >= 1.8,
    "Os apoios inferiores do botao precisam manter a espessura reforcada.");
assert(abs(button_pocket_total_depth - button_support_thickness
        - button_seat_depth) < 0.01,
    "A face de apoio precisa coincidir com a base do botao ilustrado.");
assert(button_body + 2 * button_pocket_clearance - 2 * button_support_lip >= 4,
    "Preserve o vao central inferior para as pernas e soldas.");
assert(abs(groove_to_button_tip - (cap_lower_shoulder_height
        + cap_contact_height + button_rest_gap)) < 0.01,
    "A distancia entre canal da trava C e botao deve incluir a folga livre.");
assert(cap_stem_diameter < button_plunger_hole,
    "A haste precisa ser menor que o furo da tampa.");
assert(retainer_outer_diameter > button_plunger_hole,
    "A trava em C precisa ser maior que o furo da tampa.");
assert(retainer_inner_diameter > cap_groove_diameter,
    "A trava em C precisa encaixar no canal da haste.");
assert(retainer_outer_diameter < button_body + 2 * button_pocket_clearance,
    "A trava em C precisa atravessar o alojamento quadrado do botao.");
assert(retainer_height < cap_groove_height,
    "A trava em C precisa ter folga axial dentro do canal da haste.");
assert(retainer_axial_clearance >= cap_head_rest_gap,
    "A folga axial da trava precisa permitir todo o curso do botao.");
assert(abs(button_body_top_gap
        - (button_actuator_height + cap_contact_height
            + cap_lower_shoulder_height + cap_groove_height
            + button_rest_gap)) < 0.01,
    "A pilha vertical deve deixar folga no atuador em repouso.");
assert(cap_head_rest_gap - button_rest_gap >= 0.5,
    "O prolongador precisa manter 0,5 mm de curso util apos tocar o botao.");
assert(retainer_slot_mouth_width > cap_groove_diameter,
    "A boca da trava em C precisa admitir o canal da haste.");
assert(retainer_slot_throat_width < cap_groove_diameter,
    "A garganta da trava em C precisa reter a haste no canal.");
assert(cap_lower_shoulder_diameter < button_plunger_hole,
    "O ombro inferior precisa atravessar o furo durante a montagem.");
assert(cap_lower_shoulder_diameter > retainer_inner_diameter,
    "O ombro inferior precisa impedir que a trava escape.");
assert(usb_opening_width > usb_connector_minor,
    "A abertura frontal precisa ser mais larga que a altura do USB-C girado.");
assert(usb_opening_height > usb_connector_major,
    "A abertura frontal precisa ser mais alta que a largura do USB-C girado.");
assert(wire_bundle_bottom_z + wire_bundle_height <= buzzer_center_z - buzzer_diameter / 2 - 0.3,
    "O tucho de fios precisa ficar abaixo do buzzer com folga.");
assert(buzzer_center_z + buzzer_diameter / 2 + review_tie_thickness <= base_height - 0.5,
    "Buzzer e abracadeira precisam ficar abaixo da tampa.");
assert(xiao_guard_top_z + 0.15 + review_tie_thickness <= base_height - 0.8,
    "A abracadeira da XIAO precisa ficar abaixo da tampa.");
assert(xiao_tie_width <= xiao_guard_width_y,
    "A cinta da XIAO nao deve ser mais larga que a zona protegida.");
assert(xiao_tie_y + xiao_guard_width_y / 2 < xiao_antenna_start_y,
    "A cinta da XIAO precisa terminar antes da antena.");
assert(xiao_guard_base_top_z < xiao_bottom_z,
    "A base reforcada das torres deve ficar abaixo da placa e dos pinos.");
assert(xiao_guard_base_margin >= 1.8,
    "O tunel da XIAO precisa deixar paredes laterais resistentes.");
assert(wire_bundle_y - (xiao_front_y + xiao_length) >= 1.2,
    "A antena da XIAO precisa de separacao do tucho de fios.");
assert(battery_tray_x - (xiao_board_x + xiao_depth_to_pin_tip) >= 2,
    "Os pinos da XIAO precisam de espaco antes do suporte da bateria.");
assert(battery_x + battery_length + 3.4 <= outer_length - wall,
    "Reserve espaco para a saida dos fios da bateria na parede direita.");
assert(battery_tray_y >= screw_positions[1][1] + screw_boss_diameter / 2 + 1,
    "O berco da bateria precisa liberar o parafuso frontal direito.");
assert(battery_bottom_z + battery_height + review_tie_thickness + 0.8
    <= base_height - button_body_height - button_body_top_gap,
    "Bateria e alojamento do botao precisam ficar separados em altura.");

// ----------------------------------------------------------------------------

module rounded_xy(length, width, height, radius) {
    hull() {
        for (x = [radius, length - radius])
            for (y = [radius, width - radius])
                translate([x, y, 0]) cylinder(h = height, r = radius);
    }
}

module side_lugs_solid() {
    lug_length = strap_slot_length + 4;
    lug_x = (outer_length - lug_length) / 2;
    translate([lug_x, -strap_lug_extension, 0])
        rounded_xy(lug_length, strap_lug_extension + strap_lug_overlap,
            strap_lug_height, 2);
    translate([lug_x, outer_width - strap_lug_overlap, 0])
        rounded_xy(lug_length, strap_lug_extension + strap_lug_overlap,
            strap_lug_height, 2);
}

module strap_slot_cuts() {
    slot_x = (outer_length - strap_slot_length) / 2;
    translate([slot_x, -3.9, -0.1])
        cube([strap_slot_length, strap_slot_width, strap_lug_height + 0.2]);
    translate([slot_x, outer_width + 1.1, -0.1])
        cube([strap_slot_length, strap_slot_width, strap_lug_height + 0.2]);
}

module buzzer_holes() {
    translate([-0.2, buzzer_center_y, buzzer_center_z])
        rotate([0, 90, 0])
            cylinder(h = wall + 0.5, d = buzzer_hole_diameter);
    for (angle = [0 : 60 : 300])
        translate([
            -0.2,
            buzzer_center_y + buzzer_hole_pattern_radius * cos(angle),
            buzzer_center_z + buzzer_hole_pattern_radius * sin(angle)
        ])
            rotate([0, 90, 0])
                cylinder(h = wall + 0.5, d = buzzer_hole_diameter);
}

module shell() {
    difference() {
        union() {
            rounded_xy(outer_length, outer_width, base_height, corner_radius);
            side_lugs_solid();
        }

        translate([wall, wall, floor_thickness])
            rounded_xy(
                outer_length - 2 * wall,
                outer_width - 2 * wall,
                base_height - floor_thickness + 0.2,
                corner_radius - wall
            );

        // USB-C: recorte pequeno na parede frontal, ja na altura da placa.
        translate([
            usb_opening_center_x - usb_opening_width / 2,
            -0.2,
            usb_opening_bottom
        ]) cube([usb_opening_width, wall + 0.5, usb_opening_height]);

        // Visor circular do LED abaixo e a direita da USB-C.
        translate([xiao_led_window_center_x, wall + 0.2,
            xiao_led_window_center_z])
            rotate([90, 0, 0])
                cylinder(h = wall + 0.5, d = xiao_led_window_diameter);

        buzzer_holes();
        strap_slot_cuts();
    }
}

module screw_bosses() {
    for (p = screw_positions)
        difference() {
            translate([p[0], p[1], floor_thickness - 0.2])
                cylinder(h = base_height - floor_thickness - 0.8,
                    d = screw_boss_diameter);
            translate([p[0], p[1], base_height - 9])
                cylinder(h = 9, d = screw_pilot_diameter);
        }
}

// A XIAO entra por cima entre duas protecoes na faixa cujos pinos foram
// retirados. A cinta aperta as protecoes impressas, nao os componentes.
module xiao_vertical_cradle() {
    support_h = xiao_bottom_z - floor_thickness;

    for (py = [xiao_front_y + 3.6, xiao_front_y + 10.8]) {
        // Sela sob a borda; a face posterior permanece inteiramente livre.
        translate([xiao_board_x - 1.25, py, floor_thickness - 0.2])
            cube([xiao_board_thickness + 1.25, 3.2, support_h + 0.2]);
        // Guia curta apenas no lado dos componentes, abaixo da placa.
        translate([xiao_board_x - 2.25, py, floor_thickness - 0.2])
            cube([1.1, 3.2, support_h + 2.2]);
    }

    // Torres abertas por cima, com 0,8 mm de folga lateral. A cinta as
    // aproxima depois da montagem; nao se deve encaixar a placa a pressao.
    // Cada pe largo conserva 2 mm de material em AMBOS os lados do tunel.
    // Na versao anterior o corte atravessava toda a base dos pilares finos.
    for (px = [xiao_front_guard_x, xiao_rear_guard_x]) {
        translate([
            px,
            xiao_tie_y - xiao_guard_width_y / 2,
            floor_thickness - 0.2
        ]) cube([
            xiao_guard_thickness,
            xiao_guard_width_y,
            xiao_guard_top_z - floor_thickness + 0.2
        ]);
        translate([
            px,
            xiao_tie_y - xiao_slot_width / 2 - xiao_guard_base_margin,
            floor_thickness - 0.2
        ]) cube([
            xiao_guard_thickness,
            xiao_slot_width + 2 * xiao_guard_base_margin,
            xiao_guard_base_top_z - floor_thickness + 0.2
        ]);
    }

    // Ponte inferior. O tunel e retirado da uniao final para que nenhum
    // apoio ou torre volte a bloquear as duas entradas da abracadeira.
    translate([
        xiao_anchor_x,
        xiao_tie_y - xiao_slot_width / 2 - anchor_wall,
        floor_thickness - 0.1
    ]) cube([xiao_anchor_length, xiao_slot_width + 2 * anchor_wall,
        xiao_slot_height + anchor_wall + 0.3]);
}

module xiao_tie_cut() {
    translate([
        xiao_front_guard_x - 0.2,
        xiao_tie_y - xiao_slot_width / 2,
        floor_thickness + 0.2
    ]) cube([xiao_rear_guard_x + xiao_guard_thickness
        - xiao_front_guard_x + 0.4, xiao_slot_width, xiao_slot_height]);
}

module buzzer_tie_cuts() {
    // Atravessa tambem os batentes acima da prateleira; antes sobrava um teto.
    // Aplicado na base inteira para a coluna traseira nao bloquear a saida.
    for (py = [buzzer_center_y - 7.2, buzzer_center_y + 5.2])
        translate([5.2, py, buzzer_shelf_z - 0.2])
            cube([review_slot_width, review_slot_height, 3.4]);
}

// Berco elevado: o bloco compactado de fios permanece abaixo do buzzer.
// O rebaixo cilindrico apoia o corpo sem criar uma placa plana em colisao.
module buzzer_shelf() {
    difference() {
        union() {
            translate([2, wire_bundle_y, buzzer_shelf_z])
                // Margem traseira maior: a fenda continua fechada, sem virar
                // um rasgo aberto na borda depois de aumentar o furo.
                cube([11.5, wire_bundle_width + 4, buzzer_shelf_thickness]);
            // A borda esquerda nasce da parede e uma perna traseira vai ate o
            // piso. A perna frontal foi removida para preservar a antena.
            translate([12, wire_bundle_y + wire_bundle_width + 0.5,
                floor_thickness - 0.2])
                cube([1.5, 1.5, buzzer_shelf_z - floor_thickness + 0.5]);
            // Batentes que seguram o cilindro deitado.
            translate([2.2, buzzer_center_y - 7, buzzer_shelf_z])
                cube([10.8, 1.2, 3]);
            translate([2.2, buzzer_center_y + 5.8, buzzer_shelf_z])
                cube([10.8, 1.2, 3]);
        }
        // Assento curvo com 0,8 mm de folga diametral. A folga tambem elimina
        // a tangencia exata com o piso do berco, evitando malha nao-manifold.
        // O buzzer fica deitado,
        // com a face sonora voltada para os sete furos da parede esquerda.
        translate([14, buzzer_center_y, buzzer_center_z])
            rotate([0, -90, 0])
                cylinder(h = 12.5, d = buzzer_diameter + 0.8);
        buzzer_tie_cuts();
    }
}

module battery_guides() {
    // Tampo de 2 mm sobre um perimetro vazado. A cinta atravessa o tunel
    // inferior; as bordas baixas apenas impedem deslizamento lateral.
    difference() {
        union() {
            translate([battery_tray_x, battery_tray_y, floor_thickness - 0.2])
                rounded_xy(battery_tray_length, battery_tray_width,
                    battery_bottom_z - floor_thickness + 0.2, 1.8);
            // Bordas baixas delimitam um alojamento de 24 x 17,5 mm.
            translate([battery_tray_x + 0.05, battery_tray_y + 0.05, battery_bottom_z - 0.5])
                difference() {
                    rounded_xy(battery_tray_length - 0.1, battery_tray_width - 0.1,
                        battery_lip_height + 0.5, 1.75);
                    translate([battery_rail - 0.05, battery_rail - 0.05, -0.1])
                        cube([battery_length + 2 * battery_clearance,
                            battery_width + 2 * battery_clearance,
                            battery_lip_height + 0.8]);
                }
        }
        // Retira o miolo macico sob o tampo, mantendo apoios perimetrais.
        translate([battery_tray_x + 1.8, battery_tray_y + 1.8,
            floor_thickness + 0.1])
            cube([battery_tray_length - 3.6, battery_tray_width - 3.6,
                battery_underpass - 0.1]);
        // Canal de 6 x 3 mm, aberto na frente e atras da plataforma.
        translate([battery_x + battery_length / 2 - review_slot_width / 2,
            battery_tray_y - 0.2, floor_thickness + 0.2])
            cube([review_slot_width, battery_tray_width + 0.4, review_slot_height]);
        // Saida dos fios em +X e corredor ate a extremidade traseira do
        // berco. Assim a celula nao precisa dobrar os fios contra a parede.
        // O recorte entra 0,2 mm no tampo para evitar faces coplanares.
        translate([battery_x + battery_length + battery_clearance - 0.1,
            battery_y + battery_width / 2 - battery_wire_gap / 2,
            battery_bottom_z - 0.2])
            cube([battery_rail + 0.3,
                battery_tray_y + battery_tray_width + 0.5
                    - (battery_y + battery_width / 2 - battery_wire_gap / 2),
                battery_height + 1.2]);
        // O tucho real de 30 x 15 mm chega 1 mm sob o canto traseiro
        // esquerdo do berco. Alivio local sem reduzir o apoio da bateria.
        translate([battery_tray_x - 0.1, wire_bundle_y - 0.5,
            floor_thickness - 0.3])
            cube([wire_bundle_x + wire_bundle_length + 0.8
                    - battery_tray_x + 0.1,
                battery_tray_y + battery_tray_width
                    - (wire_bundle_y - 0.5) + 0.5,
                battery_bottom_z + battery_lip_height + 1]);
    }
}

module base() {
    difference() {
      union() {
        shell();
        screw_bosses();
        xiao_vertical_cradle();
        buzzer_shelf();
        battery_guides();
      }
      buzzer_tie_cuts();
      xiao_tie_cut();
    }
}

module lid_rim() {
    rim_length = outer_length - 2 * (wall + lid_clearance);
    rim_width = outer_width - 2 * (wall + lid_clearance);
    rim_radius = corner_radius - wall - lid_clearance;

    difference() {
        translate([wall + lid_clearance, wall + lid_clearance, -lid_rim_depth])
            rounded_xy(rim_length, rim_width, lid_rim_depth + 0.1, rim_radius);
        translate([
            wall + lid_clearance + lid_rim_thickness,
            wall + lid_clearance + lid_rim_thickness,
            -lid_rim_depth - 0.1
        ]) rounded_xy(
            rim_length - 2 * lid_rim_thickness,
            rim_width - 2 * lid_rim_thickness,
            lid_rim_depth + 0.2,
            max(rim_radius - lid_rim_thickness, 0.8)
        );
    }
}

module button_lower_supports() {
    pocket = button_body + 2 * button_pocket_clearance;
    // Duas abas continuas: deixam o centro e a entrada frontal abertos.
    // A espessura cresce PARA BAIXO, sem elevar o botao nem encurtar seu curso.
    // Cada aba invade 1,2 mm do bolso e se une a toda a parede de 1,4 mm.
    translate([
        button_center_x - pocket / 2 - button_pocket_wall,
        button_center_y - pocket / 2,
        -button_pocket_total_depth
    ]) cube([button_pocket_wall + button_support_lip,
        pocket, button_support_thickness]);
    translate([
        button_center_x + pocket / 2 - button_support_lip,
        button_center_y - pocket / 2,
        -button_pocket_total_depth
    ]) cube([button_pocket_wall + button_support_lip,
        pocket, button_support_thickness]);
}

module button_pocket() {
    pocket = button_body + 2 * button_pocket_clearance;
    wall_t = button_pocket_wall;
    depth = button_seat_depth;
    total_depth = button_pocket_total_depth;

    // O botao soldado desliza pela abertura frontal do alojamento em U.
    translate([
        button_center_x - pocket / 2 - wall_t,
        button_center_y - pocket / 2 - wall_t,
        -total_depth
    ]) cube([wall_t, pocket + 2 * wall_t, total_depth + 0.2]);
    translate([
        button_center_x + pocket / 2,
        button_center_y - pocket / 2 - wall_t,
        -total_depth
    ]) cube([wall_t, pocket + 2 * wall_t, total_depth + 0.2]);
    translate([
        button_center_x - pocket / 2,
        button_center_y + pocket / 2,
        -total_depth
    ]) cube([pocket, wall_t, total_depth + 0.2]);

    // As abas sao parte da tampa, nao pecas soltas nem um encaixe por pressao.
    button_lower_supports();

    // Ressaltos de retencao: entra com clique e nao volta sozinho.
    for (side = [-1, 1])
        translate([
            side < 0
                ? button_center_x - pocket / 2 - 0.1
                : button_center_x + pocket / 2 - 0.5,
            button_center_y - pocket / 2 - 0.35,
            -depth + 1.2
        ]) cube([0.6, 1.1, 1.2]);
}

module lid_assembled() {
    difference() {
        union() {
            rounded_xy(outer_length, outer_width, lid_thickness, corner_radius);
            lid_rim();
            button_pocket();
        }

        translate([
            button_center_x,
            button_center_y,
            -button_body_height - 1
        ]) cylinder(h = button_body_height + lid_thickness + 2,
            d = button_plunger_hole);

        // Alivio apenas no aro interno: preserva a tampa externa e evita que
        // o aro encoste no buzzer ou na abracadeira depois da compactacao.
        translate([2.1, buzzer_center_y - 7.1, -lid_rim_depth - 0.1])
            cube([2.1, 14.2, lid_rim_depth + 0.2]);

        for (p = screw_positions) {
            // O aro interno contorna a torre da base com 0,4 mm de folga
            // radial. Este alivio existe somente nos 2 mm inferiores do aro;
            // o furo e o rebaixo da cabeca na tampa permanecem inalterados.
            translate([p[0], p[1], -lid_rim_depth - 0.2])
                cylinder(h = lid_rim_depth + 0.25,
                    d = screw_boss_diameter + 2 * lid_clearance);
            translate([p[0], p[1], -lid_rim_depth - 0.2])
                cylinder(h = lid_rim_depth + lid_thickness + 0.4,
                    d = screw_lid_clearance);
            translate([p[0], p[1], lid_thickness - screw_head_depth])
                cylinder(h = screw_head_depth + 0.2, d = screw_head_diameter);
        }
    }
}

module lid_for_print() {
    translate([0, outer_width, lid_thickness]) rotate([180, 0, 0])
        lid_assembled();
}

module button_cap() {
    union() {
        cylinder(h = cap_head_height, d = cap_head_diameter);

        // Trecho que atravessa a tampa com 0,30 mm de folga radial.
        translate([0, 0, -cap_through_length])
            cylinder(h = cap_through_length + 0.1, d = cap_stem_diameter);

        // Canal de 1,8 mm com trava em C de 1,0 mm e folga de retorno.
        translate([0, 0, -cap_through_length - cap_groove_height])
            cylinder(h = cap_groove_height + 0.1, d = cap_groove_diameter);

        // Segundo ombro do canal; passa pelo furo, mas segura a trava no eixo.
        translate([0, 0,
            -cap_through_length
            - cap_groove_height
            - cap_lower_shoulder_height
        ]) cylinder(
            h = cap_lower_shoulder_height + 0.1,
            d = cap_lower_shoulder_diameter
        );

        // Pino central que toca somente o atuador do botao real.
        translate([0, 0, -cap_stem_length])
            cylinder(h = cap_contact_height + 0.1, d = cap_contact_diameter);
    }
}

module button_cap_for_print() {
    translate([0, 0, cap_head_height]) rotate([180, 0, 0]) button_cap();
}

module button_retainer() {
    difference() {
        cylinder(h = retainer_height, d = retainer_outer_diameter);
        translate([0, 0, -0.1])
            cylinder(h = retainer_height + 0.2, d = retainer_inner_diameter);
        // Entrada afunilada: boca ampla para guiar a montagem e garganta
        // estreita para o C continuar envolvendo o canal do eixo.
        translate([0, 0, -0.1])
            linear_extrude(height = retainer_height + 0.2)
                polygon(points = [
                    [0, -retainer_slot_throat_width / 2],
                    [retainer_outer_diameter / 2 + 0.2,
                        -retainer_slot_mouth_width / 2],
                    [retainer_outer_diameter / 2 + 0.2,
                        retainer_slot_mouth_width / 2],
                    [0, retainer_slot_throat_width / 2]
                ]);
    }
}

module button_set_for_print() {
    button_cap_for_print();
    translate([12, 0, 0]) button_retainer();
}

module mock_components(show_cap = true) {
    // XIAO na borda longa, face dos componentes para a janela lateral.
    color([0.10, 0.20, 0.18, 0.94])
        translate([xiao_board_x, xiao_front_y, xiao_bottom_z])
            cube([xiao_board_thickness, xiao_length, xiao_height]);

    // Somente os pontos que permaneceram soldados: D1 e D3 na fileira
    // inferior; GND e 3V3 na superior. Dimensoes ainda sao aproximadas.
    color([0.83, 0.55, 0.16, 0.85]) {
        for (k = [1, 3])
            translate([xiao_board_x + xiao_board_thickness,
                xiao_front_y + 2 + 2.54 * k,
                xiao_bottom_z + 1 - 0.45])
                cube([xiao_depth_to_pin_tip - xiao_board_thickness,
                    0.9, 0.9]);
        for (k = [1, 2])
            translate([xiao_board_x + xiao_board_thickness,
                xiao_front_y + 2 + 2.54 * k,
                xiao_bottom_z + xiao_height - 1 - 0.45])
                cube([xiao_depth_to_pin_tip - xiao_board_thickness,
                    0.9, 0.9]);
    }

    // Blindagem; a faixa final da placa permanece livre para a antena BLE.
    color([0.72, 0.75, 0.78, 0.98])
        translate([
            xiao_board_x - 2.2,
            xiao_front_y + 5.2,
            xiao_bottom_z + 2.8
        ]) cube([2.2, 11, 12]);

    // USB-C atravessando a parede frontal.
    color([0.63, 0.66, 0.69, 0.98])
        translate([
            usb_opening_center_x - usb_connector_minor / 2,
            xiao_front_y - (xiao_total_length_with_usb - xiao_length),
            usb_opening_bottom
                + (usb_opening_height - usb_connector_major) / 2
        ]) cube([usb_connector_minor, 3, usb_connector_major]);

    // Marcador visual no ponto da janela; nao representa o corpo do LED.
    color([0.15, 0.90, 0.30, 1])
        translate([xiao_led_window_center_x, wall + 0.3,
            xiao_led_window_center_z])
            rotate([90, 0, 0])
                cylinder(h = 0.6, d = 1.6);

    // Antena destacada apenas para mostrar a zona que deve ficar livre.
    color([0.86, 0.62, 0.14, 0.95])
        translate([
            xiao_board_x - 0.2,
            xiao_antenna_start_y,
            xiao_bottom_z + 2
        ]) cube([2, xiao_length - 16, 13.8]);

    // Enforca-gato ilustrativo. Ele passa por fora das duas torres e fica
    // 0,8 mm acima da placa; este volume laranja nao e uma peca impressa.
    color([1, 0.38, 0.03, 0.88]) {
        tie_outer_x0 = xiao_front_guard_x - review_tie_thickness;
        tie_outer_x1 = xiao_rear_guard_x + xiao_guard_thickness;
        tie_z0 = floor_thickness + 0.55;
        tie_ztop = xiao_guard_top_z + 0.15;
        translate([tie_outer_x0,
            xiao_tie_y - xiao_tie_width / 2, tie_z0])
            cube([tie_outer_x1 - tie_outer_x0 + review_tie_thickness,
                xiao_tie_width, review_tie_thickness]);
        translate([tie_outer_x0,
            xiao_tie_y - xiao_tie_width / 2, tie_ztop])
            cube([tie_outer_x1 - tie_outer_x0 + review_tie_thickness,
                xiao_tie_width, review_tie_thickness]);
        for (px = [tie_outer_x0, tie_outer_x1])
            translate([px,
                xiao_tie_y - xiao_tie_width / 2, tie_z0])
                cube([review_tie_thickness, xiao_tie_width,
                    tie_ztop - tie_z0 + review_tie_thickness]);
    }

    // Tucho real de fios sob o buzzer.
    color([0.15, 0.15, 0.17, 0.82])
        translate([wire_bundle_x, wire_bundle_y, wire_bundle_bottom_z])
            cube([wire_bundle_length, wire_bundle_width, wire_bundle_height]);
    for (offset = [0 : 3 : 12])
        color([0.80, 0.16 + offset / 100, 0.12, 0.92])
            translate([
                wire_bundle_x + 2,
                wire_bundle_y + 1 + offset,
                wire_bundle_bottom_z + wire_bundle_height - 0.8
            ]) cube([wire_bundle_length - 4, 1.1, 1.1]);

    // Buzzer acima do tucho, face sonora alinhada aos furos altos.
    color([0.06, 0.06, 0.06, 0.97])
        translate([buzzer_axis_start_x, buzzer_center_y, buzzer_center_z])
            rotate([0, -90, 0]) cylinder(h = buzzer_length, d = buzzer_diameter);

    // Abracadeira media do buzzer: passa pelas duas fendas da prateleira.
    color([0.08, 0.08, 0.08, 0.92]) {
        translate([5.2 + (review_slot_width - review_tie_width) / 2,
            buzzer_center_y - 7, buzzer_center_z + buzzer_diameter / 2])
            cube([review_tie_width, 14, review_tie_thickness]);
        translate([5.2 + (review_slot_width - review_tie_width) / 2,
            buzzer_center_y - 7, buzzer_shelf_z - 0.2])
            cube([review_tie_width, 14, review_tie_thickness]);
    }

    // A cinta da XIAO e mostrada acima: passa na faixa sem pinos, antes da
    // antena. A passagem inferior agora atravessa toda a base montada.

    battery_demo(false);

    // Conector branco solto no piso; o berco dedicado foi retirado.
    color([0.94, 0.94, 0.90, 0.98])
        translate([connector_x, connector_y, connector_bottom_z])
            cube([connector_length, connector_width, connector_height]);

    // Botao preso no alojamento em U sob a tampa.
    color([0.10, 0.10, 0.10, 0.96])
        translate([
            button_center_x - button_body / 2,
            button_center_y - button_body / 2,
            base_height - button_body_top_gap - button_body_height
        ]) cube([button_body, button_body, button_body_height]);
    color([0.18, 0.18, 0.18, 0.98])
        translate([
            button_center_x,
            button_center_y,
            base_height - button_body_top_gap
        ]) cylinder(h = button_actuator_height, d = 3.2);

    if (show_cap) {
        // A trava fica apoiada sob a tampa, encaixada no canal da haste.
        color([0.95, 0.68, 0.12, 0.98])
            translate([
                button_center_x,
                button_center_y,
                base_height - retainer_height
            ]) button_retainer();

        color([0.90, 0.25, 0.20, 0.98])
            translate([
                button_center_x,
                button_center_y,
                base_height + lid_thickness + cap_head_rest_gap
            ]) button_cap();
    }
}

module exploded_view() {
    lift = 17;
    color([0.18, 0.48, 0.75, 0.62]) base();
    mock_components(false);
    color([0.22, 0.60, 0.82, 0.52])
        translate([0, 0, base_height + lift]) lid_assembled();
    color([0.90, 0.25, 0.20, 0.98])
        translate([
            button_center_x,
            button_center_y,
            base_height + lift + lid_thickness + cap_head_rest_gap
        ]) button_cap();
}

module buzzer_detail_view() {
    // Vista isolada para conferir no F5: duas pernas chegam ao piso, o tucho
    // passa livre por baixo e o buzzer fecha com a cinta sobre a prateleira.
    color([0.18, 0.48, 0.75, 0.78]) buzzer_shelf();
    color([0.15, 0.15, 0.17, 0.82])
        translate([wire_bundle_x, wire_bundle_y, wire_bundle_bottom_z])
            cube([wire_bundle_length, wire_bundle_width, wire_bundle_height]);
    color([0.06, 0.06, 0.06, 0.97])
        translate([buzzer_axis_start_x, buzzer_center_y, buzzer_center_z])
            rotate([0, -90, 0]) cylinder(h = buzzer_length, d = buzzer_diameter);
    color([0.08, 0.08, 0.08, 0.92]) {
        translate([5.2 + (review_slot_width - review_tie_width) / 2,
            buzzer_center_y - 7, buzzer_center_z + buzzer_diameter / 2])
            cube([review_tie_width, 14, review_tie_thickness]);
        translate([5.2 + (review_slot_width - review_tie_width) / 2,
            buzzer_center_y - 7, buzzer_shelf_z - 0.2])
            cube([review_tie_width, 14, review_tie_thickness]);
    }
}

module battery_demo(show_connector = true) {
    // Somente ilustracao: bateria, cinta e fios NAO entram no STL da base.
    color([0.78, 0.79, 0.82])
        translate([battery_x, battery_y, battery_bottom_z])
            rounded_xy(battery_length, battery_width, battery_height, 0.6);
    color([0.95, 0.72, 0.12])
        translate([battery_x + battery_length - 2, battery_y, battery_bottom_z + 0.02])
            cube([2, battery_width, battery_height]);
    tx = battery_x + battery_length / 2 - review_tie_width / 2;
    zlow = floor_thickness + 0.5;
    ztop = battery_bottom_z + battery_height + 0.2;
    color([1, 0.45, 0.04]) {
        translate([tx, battery_tray_y - review_tie_thickness, zlow])
            cube([review_tie_width, battery_tray_width + 2 * review_tie_thickness,
                review_tie_thickness]);
        translate([tx, battery_tray_y - review_tie_thickness, ztop])
            cube([review_tie_width, battery_tray_width + 2 * review_tie_thickness,
                review_tie_thickness]);
        for (py = [battery_tray_y - review_tie_thickness,
            battery_tray_y + battery_tray_width])
            translate([tx, py, zlow])
                cube([review_tie_width, review_tie_thickness, ztop - zlow + 0.01]);
    }
    for (k = [0, 1]) {
        points = [
            [battery_x + battery_length - 0.3, battery_y + battery_width / 2 + 1.3 * k, battery_bottom_z + 2],
            [outer_length - wall - 0.4 + 1.3 * k,
                battery_y + battery_width / 2 + 1.3 * k,
                battery_bottom_z + 2],
            [outer_length - wall - 0.4 + 1.3 * k,
                connector_y + 2 + 1.3 * k, connector_bottom_z + 2],
            [connector_x + connector_length, connector_y + 2 + 1.3 * k, connector_bottom_z + 2]
        ];
        color(k == 0 ? [0.8, 0.04, 0.03] : [0.08, 0.08, 0.08])
            for (i = [0 : len(points) - 2]) hull() {
                translate(points[i]) sphere(d = 1);
                translate(points[i+1]) sphere(d = 1);
            }
    }
    if (show_connector)
        color([0.96, 0.96, 0.90])
            translate([connector_x, connector_y, connector_bottom_z])
                cube([connector_length, connector_width, connector_height]);
}

module battery_detail_view() {
    color([0.18, 0.48, 0.75]) {
        translate([battery_tray_x - 1, battery_tray_y - 1, 0])
            cube([battery_tray_length + 2, battery_tray_width + 2, floor_thickness]);
        battery_guides();
    }
    if (show_battery_demo) battery_demo();
}

module tie_detail_view() {
    // Duas vistas locais do modelo, sem componentes escondendo os furos.
    color([0.18, 0.48, 0.75]) xiao_vertical_cradle();
    color([0.18, 0.48, 0.75]) buzzer_shelf();
    // Os volumes laranja mostram a fita com folga dentro das passagens.
    color([1, 0.55, 0.1, 0.65])
        translate([xiao_anchor_x - 2, xiao_tie_y - xiao_tie_width / 2,
            floor_thickness + 0.5])
            cube([xiao_anchor_length + 4, xiao_tie_width, review_tie_thickness]);
    for (py = [buzzer_center_y - 7.2, buzzer_center_y + 5.2])
        color([1, 0.55, 0.1, 0.65])
            translate([5.2 + (review_slot_width - review_tie_width) / 2,
                py + (review_slot_height - review_tie_thickness) / 2,
                buzzer_shelf_z - 2])
                cube([review_tie_width, review_tie_thickness, 7]);
}

module lid_top_view() {
    color([0.22, 0.60, 0.82, 0.88]) lid_assembled();
    color([0.90, 0.25, 0.20, 0.98])
        translate([
            button_center_x,
            button_center_y,
            lid_thickness + cap_head_rest_gap
        ]) button_cap();
}

module button_detail_view() {
    // Recorte local da tampa: mostra o alojamento quadrado, o corpo real,
    // a haste, o canal e a trava em C na posicao de repouso.
    color([0.22, 0.60, 0.82, 0.58])
        intersection() {
            lid_assembled();
            translate([button_center_x - 7, button_center_y - 7,
                -button_pocket_total_depth - 0.5])
                cube([14, 14,
                    button_pocket_total_depth + lid_thickness + 1]);
        }

    color([0.10, 0.10, 0.10, 0.98])
        translate([button_center_x - button_body / 2,
            button_center_y - button_body / 2,
            -button_body_top_gap - button_body_height])
            cube([button_body, button_body, button_body_height]);
    color([0.18, 0.18, 0.18, 0.98])
        translate([button_center_x, button_center_y, -button_body_top_gap])
            cylinder(h = button_actuator_height, d = 3.2);
    color([0.95, 0.68, 0.12, 0.98])
        translate([button_center_x, button_center_y, -retainer_height])
            button_retainer();
    color([0.90, 0.25, 0.20, 0.98])
        translate([button_center_x, button_center_y,
            lid_thickness + cap_head_rest_gap])
            button_cap();
}

// Deve resultar vazio. Qualquer volume gerado aqui representa interferencia
// material entre a base e a tampa na posicao final de fechamento.
module closure_interference_test() {
    intersection() {
        base();
        // 0,01 mm elimina apenas o contato matematico entre as duas faces
        // externas; uma colisao volumetrica real continuaria aparecendo.
        translate([0, 0, base_height + 0.01]) lid_assembled();
    }
}

if (part == "validation") {
    // Reservado aos testes de interferencia; nao gera pecas por si so.
} else if (part == "base") {
    base();
} else if (part == "lid") {
    lid_for_print();
} else if (part == "button_cap") {
    button_cap_for_print();
} else if (part == "button_retainer") {
    button_retainer();
} else if (part == "button_set") {
    button_set_for_print();
} else if (part == "closure_interference") {
    closure_interference_test();
} else if (part == "battery_detail") {
    battery_detail_view();
} else if (part == "layout") {
    color([0.18, 0.48, 0.75, 0.55]) base();
    if (show_components) mock_components(false);
    else if (show_battery_demo) battery_demo();
} else if (part == "buzzer_detail") {
    buzzer_detail_view();
} else if (part == "button_detail") {
    button_detail_view();
} else if (part == "tie_detail") {
    tie_detail_view();
} else if (part == "exploded") {
    exploded_view();
} else if (part == "lid_top") {
    lid_top_view();
} else {
    color([0.18, 0.48, 0.75, 0.55]) base();
    if (show_components) mock_components();
    color([0.22, 0.60, 0.82, 0.25])
        translate([0, 0, base_height]) lid_assembled();
}
