import Attribute from '../nodes/Attribute';
import Block from '../render_dom/Block';
export default function get_slot_data(values: Map<string, Attribute>, block?: Block): {
    type: string;
    properties: import("estree").Property[];
};
