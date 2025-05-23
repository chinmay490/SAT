// Chatbot functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatButton = document.querySelector('.chat-button');
    const chatWindow = document.querySelector('.chat-window');
    const closeButton = document.querySelector('.close-button');
    const sendButton = document.querySelector('.send-button');
    const messageInput = document.querySelector('.message-input');
    const chatMessages = document.querySelector('.chat-messages');

    let currentState = 'visit';
    let orderData = {};
    let isSubmitting = false;
    let conversationHistory = []; // Add history tracking

    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>`;
    refreshButton.style.position = 'absolute';
    refreshButton.style.top = '15px';
    refreshButton.style.right = '50px';
    refreshButton.style.padding = '0';
    refreshButton.style.backgroundColor = 'transparent';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.width = '36px';
    refreshButton.style.height = '36px';
    refreshButton.style.display = 'flex';
    refreshButton.style.alignItems = 'center';
    refreshButton.style.justifyContent = 'center';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.transition = 'all 0.3s ease';

    // Add hover effect
    refreshButton.addEventListener('mouseover', () => {
        refreshButton.style.backgroundColor = '#1a3d3d';
        refreshButton.style.transform = 'scale(1.1)';
    });
    refreshButton.addEventListener('mouseout', () => {
        refreshButton.style.backgroundColor = 'transparent';
        refreshButton.style.transform = 'scale(1)';
    });

    chatWindow.querySelector('.chat-header').appendChild(refreshButton);

    // Add refresh functionality
    refreshButton.addEventListener('click', () => {
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Reset order data
        orderData = {};
        
        // Reset current state
        currentState = 'visit';
        
        // Clear conversation history
        conversationHistory = [];
        
        // Show welcome message
        showCurrentNode();
        
        // Clear input field
        messageInput.value = '';
        
        // Reset input type
        messageInput.type = 'text';
        messageInput.style.height = '40px';
        messageInput.style.resize = 'none';
        
        // Remove any event listeners
        messageInput.removeEventListener('input', phoneInputHandler);
    });

    // Make chat window mobile responsive
    const chatWindowStyle = chatWindow.style;
    chatWindowStyle.width = '450px';  // Increased from 350px
    chatWindowStyle.maxWidth = '100%';
    chatWindowStyle.height = '600px';  // Increased from 500px
    chatWindowStyle.maxHeight = '90vh';
    chatWindowStyle.position = 'fixed';
    chatWindowStyle.bottom = '20px';
    chatWindowStyle.right = '20px';
    chatWindowStyle.backgroundColor = 'white';
    chatWindowStyle.borderRadius = '10px';
    chatWindowStyle.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    chatWindowStyle.display = 'none';
    chatWindowStyle.flexDirection = 'column';
    chatWindowStyle.zIndex = '1000';

    // Make chat messages container scrollable
    const chatMessagesStyle = chatMessages.style;
    chatMessagesStyle.flex = '1';
    chatMessagesStyle.overflowY = 'auto';
    chatMessagesStyle.padding = '20px';
    chatMessagesStyle.display = 'flex';
    chatMessagesStyle.flexDirection = 'column';
    chatMessagesStyle.gap = '10px';

    // Style message input for mobile
    const messageInputStyle = messageInput.style;
    messageInputStyle.width = 'calc(100% - 100px)'; // Adjust width to leave space for send button
    messageInputStyle.padding = '10px';
    messageInputStyle.border = '1px solid #ddd';
    messageInputStyle.borderRadius = '5px';
    messageInputStyle.marginTop = '10px';
    messageInputStyle.boxSizing = 'border-box';
    messageInputStyle.display = 'inline-block';
    messageInputStyle.verticalAlign = 'middle';

    // Style send button for mobile
    const sendButtonStyle = sendButton.style;
    sendButtonStyle.padding = '10px 20px';
    sendButtonStyle.marginLeft = '10px';
    sendButtonStyle.backgroundColor = '#245352';
    sendButtonStyle.color = 'white';
    sendButtonStyle.border = 'none';
    sendButtonStyle.borderRadius = '5px';
    sendButtonStyle.cursor = 'pointer';
    sendButtonStyle.fontSize = '14px';
    sendButtonStyle.minWidth = '80px';
    sendButtonStyle.display = 'inline-block';
    sendButtonStyle.verticalAlign = 'middle';
    sendButtonStyle.marginTop = '10px';

    // Style options container for mobile
    const style = document.createElement('style');
    style.textContent = `
        .options-container {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
            justify-content: flex-start;
        }
        .option-button {
            padding: 12px 20px;
            border: 1px solid #245352;
            border-radius: 5px;
            background: #245352;
            color: white;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s ease;
            font-size: 15px;
            flex: 0 1 calc(50% - 5px);
            min-width: 120px;
            white-space: normal;
            word-wrap: break-word;
            height: auto;
        }
        .option-button:hover {
            background-color: #1a3d3c;
            transform: scale(1.05);
        }
        .message {
            font-size: 15px;
            padding: 12px;
        }
        @media (max-width: 480px) {
            .chat-window {
                width: 100% !important;
                height: 100% !important;
                bottom: 0 !important;
                right: 0 !important;
                border-radius: 0 !important;
            }
            .chat-header {
                padding: 15px !important;
            }
            .message {
                max-width: 85% !important;
            }
            .option-button {
                flex: 0 1 100%;
            }
        }
    `;
    document.head.appendChild(style);

    // Chat flow definition
    const chatFlow = {
        nodes: [
            {
                id: "visit",
                text: "👋 Welcome to our Sharda Auto Traders! I'm here to assist you. What service are you looking for?",
                type: "options",
                options: [
                    { text: "Products", next: "welcome" },
                    { text: "Visit", next: "visit_1" }
                ]
            },
            {
                id: "visit_1",
                text: "Please visit our Contact Us page and fill in your details under the (Let us know how we can help you!) section.<br><br>Don't forget to include your address and any specific queries you have — we'll get back to you as soon as possible!<br><br>👉 <a href='Contact Us.html' style='color: #245352; text-decoration: underline;'>Go to Contact Us Page</a>",
            },
            {
                id: "welcome",
                text: "What service are you looking for?",
                type: "options",
                options: [
                    { text: "Seals", next: "seals_types" },
                    { text: "New Hydraulic Equipment", next: "new_hydraulic_equipment" },
                    { text: "Repair of hydraulic equipment", next: "repair_equipment" },
                    { text: "New Pneumatic Equipment", next: "new_pneumatic_equipment" },
                    { text: "Tractor Equipment", next: "tractor_equipment" }
                ]
            },
            {   
                id: "seals_types",
                text: "Great! What type of seals are you looking for?",
                type: "options",
                options: [
                    { text: "Oil Seals", next: "oil_seals_brand" },
                    { text: "Piston Seals", next: "piston_seals_info" },
                    { text: "Compact Piston Seals", next: "compact_piston_seals_info" },
                    { text: "U Seals", next: "u_seals_material" },
                    { text: "Rod Seals", next: "rod_seals_material" },
                    { text: "Chevron Sets", next: "chevron_sets_info" },
                    { text: "Wiper Seals", next: "wiper_seals_material" },
                    { text: "Trolley Jack Seals", next: "trolley_jack_seals" },
                    { text: "O Rings", next: "o_rings_material" },
                    { text: "Concrete Mixer Seals", next: "concrete_mixer_seals_info" },
                    { text: "Cassette Seals", next: "cassette_seals_info" },
                    { text: "Mechanical Seals", next: "mechanical_seals_info" },
                    { text: "Guide Belt", next: "guide_belt_info" },
                    { text: "Dowty Seals", next: "dowty_seals_info" },
                    { text: "Circlips", next: "circlips_type" }
                ]
            },
            {
                id: "oil_seals_brand",
                text: "Which brand of oil seals do you prefer?",
                type: "options",
                options: [
                    { text: "CFW NOK", next: "oil_seals_info" },
                    { text: "SOG", next: "oil_seals_info" },
                    { text: "JK Fenner", next: "oil_seals_info" },
                    { text: "NQK SF", next: "oil_seals_info" },
                    { text: "Opson", next: "oil_seals_info" },
                    { text: "G.D.Royal", next: "oil_seals_info" }
                ]
            },
            {
                id: "oil_seals_info",
                text: "Please mention the dimensions. If you want more information regarding oil seals, you can visit our product page.",
                type: "input",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "piston_seals_info",
                type: "input",
                text: "please mention the dimensions. If you want more information regarding piston seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "compact_piston_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding compact piston seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "u_seals_material",
                type: "options",
                text: "Which material you want?",
                options: [
                    { text: "PU (Polyurethane)", next: "u_seals_info" },
                    { text: "NBR", next: "u_seals_info" },
                    { text: "Canvas", next: "u_seals_info" },
                    { text: "VITON", next: "u_seals_info" }
                ]
            },
            {
                id: "u_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding U-seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "rod_seals_material",
                text: "What material would you prefer for the rod step seals?",
                type: "options",
                options: [
                    { text: "PU (Polyurethane)", next: "rod_seals_info" },
                    { text: "Bronze filled PTFE", next: "rod_seals_info" }
                ]
            },
            {
                id: "rod_seals_info",
                text: "Please mention the dimensions. If you want more information regarding rod seals, you can visit our product page.",
                type: "input",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "chevron_sets_material",
                type: "options",
                text: "Which material you want?",
                options: [
                    { text: "PU (Polyurethane)", next: "chevron_sets_info" },
                    { text: "Canvas", next: "chevron_sets_info" },
                    { text: "VITON", next: "chevron_sets_info" },
                    { text: "PU+POM", next: "chevron_sets_info" }
                ]
            },
            {
                id: "chevron_sets_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding chevron sets, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "wiper_seals_material",
                type: "options",
                text: "Which material/type you want?",
                options: [
                    { text: "PU (Polyurethane) Single lip", next: "wiper_seals_info" },
                    { text: "PU (Polyurethane) Double lip", next: "wiper_seals_info" },
                    { text: "NBR Single lip", next: "wiper_seals_info" },
                    { text: "NBR Double lip", next: "wiper_seals_info" },
                    { text: "NBR Triple lip", next: "wiper_seals_info" },
                    { text: "Metal wiper seal", next: "wiper_seals_info" }
                ]
            },
            {
                id: "wiper_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding wiper seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "trolley_jack_seals",
                type: "options",
                text: "Which type of jack seals",
                options: [
                    { text: "Trolley jack sealkits", next: "trolley_jack_seals_info" },
                    { text: "Bottle jack sealkits", next: "trolley_jack_seals_info" }
                ]
            },
            {
                id: "trolley_jack_seals_info",
                type: "input",
                text: "Please mention the dimensions, and weight. If you want more information regarding trolley jack seal kits, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "o_rings_material",
                text: "What material would you prefer for the O-rings?",
                type: "options",
                options: [
                    { text: "NBR (Nitrile Butadiene Rubber)", next: "o_rings_info" },
                    { text: "Viton (FKM)", next: "o_rings_info" },
                    { text: "Silicone", next: "o_rings_info" },
                    { text: "Teflon", next: "o_rings_info" },
                    { text: "O-Ring boxes", next: "o_rings_info" }
                ]
            },
            {
                id: "o_rings_info",
                text: "please mention the dimensions. If you want more information regarding O-Rings, you can visit our product page.",
                type: "input",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "concrete_mixer_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding concrete mixer seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "cassette_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding cassette seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "mechanical_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding mechanical seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "guide_belt_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding guide belt, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "dowty_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding dowty seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "circlips_type",
                type: "options",
                text: "Which type you want?",
                options: [
                    { text: "Internal circlip", next: "circlips_info" },
                    { text: "External Circlip", next: "circlips_info" },
                    { text: "E-type circlip", next: "circlips_info" }
                ]
            },
            {
                id: "circlips_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding circlips, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "Quantity",
                type: "input",
                text: "How many units do you need?",
                input_type: "text",
                next: "customer_name"
            },
            {
                id: "customer_name",
                text: "Thank you for providing those details. Now, let's get some information about you so we can process your order. What is your name/ Company name?",
                type: "input",
                input_type: "text",
                next: "customer_email"
            },
            {
                id: "customer_email",
                text: "What is your email address?",
                type: "input",
                input_type: "email",
                next: "customer_contact"
            },
            {
                id: "customer_contact",
                text: "What is your contact number?",
                type: "input",
                input_type: "tel",
                next: "delivery_Location_question"
            },
            {
                id: "delivery_Location_question",
                text: "Where would you like to receive your order? Please enter your address.",
                type: "input",
                input_type: "text",
                next: "delivery_date_question"
            },
            {
                id: "delivery_date_question",
                text: "When would you like to receive your order? Please select a date.",
                type: "calendar",
                next: "order_summary"
            },
            {
                id: "order_summary",
                text: "Here's a summary of your order. Please review and click 'Submit Order' when you're ready.",
                type: "summary",
                next: "thank_you_confirmation"
            },
            {
                id: "thank_you_confirmation",
                text: "Thank you for your order! Your information has been saved successfully. We will contact you soon to confirm your order details.",
                type: "message"
            },
            {
                id: "new_hydraulic_equipment",
                type: "options",
                text: "Which new equipment you want?",
                options: [
                    { text: "Hydraulic Cylinder", next: "hydraulic_cylinder_parts" },
                    { text: "Hydraulic power pack equipment", next: "hydraulic_power_pack" },
                    { text: "Hydraulic pumps", next: "hydraulic_pumps" },
                    { text: "Hydraulic motor", next: "hydraulic_motor_brand" },
                    { text: "Hydraulic valves", next: "hydraulic_valves" },
                    { text: "Pressure control module and manifold blocks", next: "pressure_control_info" },
                    { text: "Solenoid coils", next: "solenoid_coils" },
                    { text: "Hydraulic Adapters", next: "hydraulic_adapters" },
                    { text: "Gear coupling", next: "gear_coupling" },
                    { text: "Bellhousing", next: "bellhousing_info" }
                ]
            },
            {
                id: "hydraulic_cylinder_parts",
                type: "options",
                text: "Which part of hydraulic cylinder?",
                options: [
                    { text: "Cylinder Rod", next: "cylinder_rod_info" },
                    { text: "Piston", next: "piston_info" },
                    { text: "Honed tube", next: "honed_tube_info" },
                    { text: "Complete cylinder", next: "complete_cylinder_type" }
                ]
            },
            {
                id: "cylinder_rod_info",
                type: "input",
                text: "Can you please specify the rod dimensions.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "piston_info",
                type: "input",
                text: "Can you please specify the barrel dimensions (ID, OD, Length).",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "honed_tube_info",
                type: "input",
                text: "Can you please specify the barrel dimensions (ID, OD, Length).",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "complete_cylinder_type",
                type: "options",
                text: "Which type of hydraulic cylinder",
                options: [
                    { text: "Single acting cylinder", next: "complete_cylinder_info" },
                    { text: "Double acting cylinder", next: "complete_cylinder_info" },
                    { text: "Telescopic cylinder", next: "complete_cylinder_info" }
                ]
            },
            {
                id: "complete_cylinder_info",
                type: "input",
                text: "Please specify the dimensions (stroke length, barrel dimension, working pressure). To learn more about hydraulic cylinders, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hydraulic_power_pack",
                type: "options",
                text: "Which power pack equipment you wanted",
                options: [
                    { text: "Breather", next: "breather_info" },
                    { text: "Oil filter", next: "oil_filter_type" },
                    { text: "Pressure gauge", next: "pressure_gauge_info" },
                    { text: "Oil level gauge", next: "oil_level_gauge_info" },
                    { text: "Hosepipes", next: "hosepipes_info" }
                ]
            },
            {
                id: "breather_info",
                type: "input",
                text: "Mention the size.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "oil_filter_type",
                type: "options",
                text: "Which type of oil filter",
                options: [
                    { text: "Suction filter", next: "oil_filter_info" },
                    { text: "Return line filter", next: "oil_filter_info" }
                ]
            },
            {
                id: "oil_filter_info",
                type: "input",
                text: "Mention size. To learn more about hydraulic oil filters, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pressure_gauge_info",
                type: "input",
                text: "Mention the type of mounting, thread size.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "oil_level_gauge_info",
                type: "input",
                text: "Mention the size.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hosepipes_info",
                type: "input",
                text: "Mention the port size, length.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hydraulic_pumps",
                type: "options",
                text: "Which type of hydraulic pump you needed",
                options: [
                    { text: "Gear Pump", next: "gear_pump_brand" },
                    { text: "Vane Pump", next: "vane_pump_brand" },
                    { text: "Plunger Piston Pump", next: "plunger_pump_type" },
                    { text: "Dowty Hand Pump", next: "dowty_hand_pump_info" }
                ]
            },
            {
                id: "gear_pump_brand",
                type: "options",
                text: "Any brand preference?",
                options: [
                    { text: "Dowty", next: "gear_pump_info" },
                    { text: "VARAK", next: "gear_pump_info" },
                    { text: "Supremo", next: "gear_pump_info" }
                ]
            },
            {
                id: "gear_pump_info",
                type: "input",
                text: "Kindly share the required LPM, shaft type, rotation direction. To learn more about hydraulic pumps, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "vane_pump_brand",
                type: "options",
                text: "Any brand preference?",
                options: [
                    { text: "Yuken", next: "vane_pump_info" },
                    { text: "Valjan", next: "vane_pump_info" }
                ]
            },
            {
                id: "vane_pump_info",
                type: "input",
                text: "Kindly share the required LPM, shaft type, rotation direction. To learn more about hydraulic pumps, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "plunger_pump_type",
                type: "options",
                text: "Which type of piston pump are you thinking of?",
                options: [
                    { text: "Open type", next: "plunger_pump_shaft_type" },
                    { text: "Closed type", next: "plunger_pump_shaft_type" }
                ]
            },
            {
                id: "plunger_pump_shaft_type",
                type: "options",
                text: "Which shaft configuration do you need?",
                options: [
                    { text: "5D Single shaft", next: "plunger_pump_info" },
                    { text: "5D Double shaft", next: "plunger_pump_info" },
                    { text: "7D Single shaft", next: "plunger_pump_info" },
                    { text: "7D Double shaft", next: "plunger_pump_info" }
                ]
            },
            {
                id: "plunger_pump_info",
                type: "input",
                text: "Kindly share the required LPM, shaft type, rotation direction. To learn more about hydraulic pumps, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "dowty_hand_pump_info",
                type: "input",
                text: "Kindly share the required LPM, shaft type, rotation direction. To learn more about hydraulic pumps, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hydraulic_motor_brand",
                type: "options",
                text: "Any brand preference?",
                options: [
                    { text: "EATON", next: "hydraulic_motor_info" },
                    { text: "Danfoss", next: "hydraulic_motor_info" },
                    { text: "Hi-Tech", next: "hydraulic_motor_info" },
                    { text: "VARAK", next: "hydraulic_motor_info" }
                ]
            },
            {
                id: "hydraulic_motor_info",
                type: "input",
                text: "Kindly share the required RPM, motor displacement (cc), working pressure. To learn more about hydraulic motors, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hydraulic_valves",
                type: "options",
                text: "Which type of valve would you like to buy?",
                options: [
                    { text: "Directional control valve", next: "directional_valve_type" },
                    { text: "Hand lever valve", next: "hand_lever_valve_brand" },
                    { text: "Pressure relief valve", next: "pressure_relief_valve_info" },
                    { text: "Pilot operated check valve modular", next: "pilot_check_valve_info" },
                    { text: "Flow control valve", next: "flow_control_valve_info" },
                    { text: "Non return valve", next: "non_return_valve_info" }
                ]
            },
            {
                id: "directional_valve_type",
                type: "options",
                text: "Which type of directional valve?",
                options: [
                    { text: "Single solenoid valve", next: "directional_valve_brand" },
                    { text: "Double solenoid valve", next: "directional_valve_brand" }
                ]
            },
            {
                id: "directional_valve_brand",
                type: "options",
                text: "Any brand preferences?",
                options: [
                    { text: "Yuken", next: "directional_valve_info" },
                    { text: "Yuci Yuken", next: "directional_valve_info" },
                    { text: "Rexroth", next: "directional_valve_info" },
                    { text: "Vickers", next: "directional_valve_info" },
                    { text: "Spica", next: "directional_valve_info" }
                ]
            },
            {
                id: "directional_valve_info",
                type: "input",
                text: "Kindly mention the port size, working pressure and model number. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hand_lever_valve_brand",
                type: "options",
                text: "Any brand preferences?",
                options: [
                    { text: "VARAK", next: "hand_lever_valve_info" },
                    { text: "Polyhydron", next: "hand_lever_valve_info" },
                    { text: "Hi-Tech", next: "hand_lever_valve_info" }
                ]
            },
            {
                id: "hand_lever_valve_info",
                type: "input",
                text: "Kindly mention the port size, working pressure. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pressure_relief_valve_info",
                type: "input",
                text: "Kindly mention the port size, working pressure. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pilot_check_valve_info",
                type: "input",
                text: "Kindly mention the port size, working pressure. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "flow_control_valve_info",
                type: "input",
                text: "Kindly mention the port size, working pressure. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "non_return_valve_info",
                type: "input",
                text: "Kindly mention the port size. To learn more about hydraulic valves, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pressure_control_info",
                type: "input",
                text: "Kindly share the specifications. To learn more about our pressure control modules and manifold blocks, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "solenoid_coils",
                type: "options",
                text: "Please select the type of solenoid coil?",
                options: [
                    { text: "AC 240V", next: "solenoid_coils_info" },
                    { text: "DC 24V", next: "solenoid_coils_info" }
                ]
            },
            {
                id: "solenoid_coils_info",
                type: "input",
                text: "Kindly mention the thread size and type.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hydraulic_adapters",
                type: "input",
                text: "Kindly mention the thread size and type.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "gear_coupling",
                type: "options",
                text: "Please choose the type you need.",
                options: [
                    { text: "Complete gear coupling", next: "gear_coupling_info" },
                    { text: "Nylon coupling", next: "gear_coupling_info" }
                ]
            },
            {
                id: "gear_coupling_info",
                type: "input",
                text: "Kindly mention the model type and number of teeth.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "bellhousing_info",
                type: "input",
                text: "Kindly share the specifications of the motor that will be mounted on the bell housing (HP, flange type)?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_equipment",
                type: "options",
                text: "Which equipment you need to repair?",
                options: [
                    { text: "Hydraulic cylinder", next: "repair_cylinder_type" },
                    { text: "Hydraulic pumps", next: "repair_pump_type" },
                    { text: "Hydraulic motor", next: "repair_motor_issue" },
                    { text: "Hydraulic Jack", next: "repair_jack_issue" },
                    { text: "Hydraulic hand lever valves", next: "repair_valve_note" },
                    { text: "Reconstruction of hydraulic power pack", next: "repair_power_pack" }
                ]
            },
            {
                id: "repair_cylinder_type",
                type: "options",
                text: "Which type of hydraulic cylinder",
                options: [
                    { text: "Single acting cylinder", next: "repair_cylinder_issue" },
                    { text: "Double acting cylinder", next: "repair_cylinder_issue" },
                    { text: "Telescopic cylinder", next: "repair_cylinder_issue" }
                ]
            },
            {
                id: "repair_cylinder_issue",
                type: "input",
                text: "What problem are you facing with the hydraulic cylinder?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_motor_issue",
                type: "input",
                text: "Can you please describe the issue you're experiencing with the hydraulic motor?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_pump_type",
                type: "options",
                text: "Which type of pump?",
                options: [
                    { text: "Gear pump", next: "repair_pump_note" },
                    { text: "Vane pump", next: "repair_pump_note" },
                    { text: "Piston pump", next: "repair_pump_note" }
                ]
            },
            {
                id: "repair_pump_note",
                type: "input",
                text: "We primarily handle seal replacements and repairs for gear pumps, piston pumps, and vane pumps. Plungers for piston pumps are also available. In most cases, redesigning gears or cartridges is not a feasible solution. Can you please describe the issue you're experiencing with the pump?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_jack_issue",
                type: "input",
                text: "Can you please describe the issue you're experiencing with the jack?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_valve_note",
                type: "message",
                text: "We only offer seal replacement services for hand lever valves. Please describe the issue you're experiencing with the valve.",
                input_type: "text",
                next: "repair_valve_issue"
            },
            {
                id: "repair_valve_issue",
                type: "input",
                text: "Can you please describe the issue you're experiencing with the valve?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "repair_power_pack",
                type: "input",
                text: "To help you with the reconstruction of the power pack, can you please share its key specifications like motor capacity, pump type, tank capacity, working pressure, and flow rate. If you have any other requirements, feel free to mention those as well.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "new_pneumatic_equipment",
                type: "options",
                text: "Which new equipment you want?",
                options: [
                    { text: "Pneumatic cylinder", next: "pneumatic_cylinder_choice" },
                    { text: "Pneumatic valves", next: "pneumatic_valve_type" },
                    { text: "FRL Unit", next: "frl_unit_part" },
                    { text: "PU Tubes", next: "pu_tubes_material" },
                    { text: "One touch fittings", next: "one_touch_fittings_info" }
                ]
            },
            {
                id: "pneumatic_cylinder_choice",
                type: "options",
                text: "You want new cylinder or repair of your old one",
                options: [
                    { text: "New cylinder", next: "pneumatic_cylinder_info" },
                    { text: "Repair", next: "pneumatic_cylinder_repair" }
                ]
            },
            {
                id: "pneumatic_cylinder_info",
                type: "input",
                text: "Mention the type and dimensions of the cylinder. If you want more information regarding pneumatic cylinders, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pneumatic_cylinder_repair",
                type: "input",
                text: "Please tell the problem that you are facing?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pneumatic_valve_type",
                type: "options",
                text: "Which type of pneumatic valve?",
                options: [
                    { text: "Solenoid valves", next: "solenoid_valve_type" },
                    { text: "Hand draw valves", next: "hand_draw_valve_info" },
                    { text: "Hand lever valves", next: "hand_lever_valve_pneumatic_info" },
                    { text: "Non-return valves", next: "non_return_valve_pneumatic_info" },
                    { text: "Quick exhaust valves", next: "quick_exhaust_valve_info" },
                    { text: "Roller lever valves", next: "roller_lever_valve_info" }
                ]
            },
            {
                id: "solenoid_valve_type",
                type: "options",
                text: "Choose which type of solenoid valve you want",
                options: [
                    { text: "Single solenoid valve", next: "solenoid_valve_info" },
                    { text: "Double solenoid valve", next: "solenoid_valve_info" }
                ]
            },
            {
                id: "solenoid_valve_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic solenoid valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hand_draw_valve_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic hand draw valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "hand_lever_valve_pneumatic_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic hand lever valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "non_return_valve_pneumatic_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic non return valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "quick_exhaust_valve_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic quick exhaust valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "roller_lever_valve_info",
                type: "input",
                text: "Mention the model number and specifications of the valve. If you want more information regarding pneumatic roller lever valves, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "frl_unit_part",
                type: "options",
                text: "Which part of FRL unit you want.",
                options: [
                    { text: "Filter", next: "frl_unit_info" },
                    { text: "Regulator", next: "frl_unit_info" },
                    { text: "Filter Regulator unit", next: "frl_unit_info" },
                    { text: "FRL", next: "frl_unit_info" }
                ]
            },
            {
                id: "frl_unit_info",
                type: "input",
                text: "Could you please provide more specifications, if available? For additional details about the Filter Regulator Lubricator (FRL) unit, please checkout our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "pu_tubes_material",
                type: "options",
                text: "Choose the material",
                options: [
                    { text: "PU (Polyurethane)", next: "pu_tubes_info" },
                    { text: "Nylon", next: "pu_tubes_info" }
                ]
            },
            {
                id: "pu_tubes_info",
                type: "input",
                text: "Mention the size and length needed.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "one_touch_fittings_info",
                type: "input",
                text: "Which type of fitting you needed ?",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "tractor_equipment",
                type: "options",
                text: "Which tractor equipment",
                options: [
                    { text: "Rotavator seals", next: "rotavator_seals_info" },
                    { text: "Quick Release Coupling", next: "qrc_type" },
                    { text: "Tractor hydraulic gear pump", next: "tractor_gear_pump_info" },
                    { text: "Gearpump sealkit", next: "gearpump_sealkit_brand" },
                    { text: "Orbitrol power steering unit", next: "Orbitrol_power_steering_unit_info" },
                    { text: "Orbitrol power steering unit sealkit", next: "Orbitrol_power_steering_unit_sealkit_info" },
                    { text: "Power steering cylinder sealkit", next: "power_steering_cylinder_sealkit_info" }
                ]
            },
            {
                id: "rotavator_seals_info",
                type: "input",
                text: "Please mention the dimensions. If you want more information regarding rotavtor seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "qrc_type",
                type: "options",
                text: "Type of Quick Release Coupling",
                options: [
                    { text: "Ball lock type", next: "qrc_info" },
                    { text: "Threaded type", next: "qrc_info" }
                ]
            },
            {
                id: "qrc_info",
                type: "input",
                text: "Please mention the size. If you want more information regarding QRC, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "tractor_gear_pump_info",
                type: "input",
                text: "Kindly share the required LPM, pump type, shaft type, rotation direction? To learn more about tractor hydraulic gear pumps, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "gearpump_sealkit_brand",
                type: "options",
                text: "Any brand preference?",
                options: [
                    { text: "Dowty", next: "gearpump_sealkit_info" },
                    { text: "Eaton", next: "gearpump_sealkit_info" },
                    { text: "Vickers", next: "gearpump_sealkit_info" }
                ]
            },
            {
                id: "gearpump_sealkit_info",
                type: "input",
                text: "Kindly share the model number and description of the gearpump.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "Orbitrol_power_steering_unit_info",
                type: "input",
                text: "Kindly share the model number. To learn more about tractor power steering units, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "Orbitrol_power_steering_unit_sealkit_info",
                type: "input",
                text: "Kindly share the specifications and size.",
                input_type: "text",
                next: "Quantity"
            },
            {
                id: "power_steering_cylinder_sealkit_info",
                type: "input",
                text: "Can you please mention your tractor's brand and model?. To learn more about tractor power steering cylinder seals, you can visit our product page.",
                input_type: "text",
                next: "Quantity"
            }
        ]
    };

    // Toggle chat window
    chatButton.addEventListener('click', () => {
        if (chatWindow.classList.contains('active')) {
            // If chat is already open, minimize it
            chatWindow.classList.remove('active');
            chatWindowStyle.display = 'none';
        } else {
            // If chat is closed, open it and show welcome message
            chatWindow.classList.add('active');
            chatWindowStyle.display = 'flex';
            // Reset everything when reopening
            chatMessages.innerHTML = '';
            orderData = {};
            currentState = 'visit';
            messageInput.value = '';
            messageInput.type = 'text';
            messageInput.style.height = '40px';
            messageInput.style.resize = 'none';
            messageInput.removeEventListener('input', phoneInputHandler);
            showCurrentNode();
        }
    });

    // Close chat window
    closeButton.addEventListener('click', () => {
        // Refresh the chat
        chatMessages.innerHTML = '';
        orderData = {};
        currentState = 'visit';
        messageInput.value = '';
        messageInput.type = 'text';
        messageInput.style.height = '40px';
        messageInput.style.resize = 'none';
        messageInput.removeEventListener('input', phoneInputHandler);
        
        // Close the chat window
        chatWindow.classList.remove('active');
        chatWindowStyle.display = 'none';
    });

    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            // Process user input based on current node type
            const currentNode = getCurrentNode();
            if (currentNode) {
                processUserInput(message, currentNode);
            }
        }
    }

    // Send message on button click
    sendButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default button behavior
        sendMessage();
    });

    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default Enter key behavior
            sendMessage();
        }
    });

    // Add message to chat
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.innerHTML = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Get current node from chat flow
    function getCurrentNode() {
        return chatFlow.nodes.find(node => node.id === currentState);
    }

    // Show current node
    function showCurrentNode() {
        const node = getCurrentNode();
        if (!node) return;

        // Clear previous messages if it's the welcome node
        if (node.id === 'visit') {
            chatMessages.innerHTML = '';
            orderData = {}; // Reset order data
        } else {
            // Clear the last bot message (previous question)
            const lastBotMessage = chatMessages.querySelector('.message.bot:last-child');
            if (lastBotMessage) {
                lastBotMessage.remove();
            }
        }

        // Add bot message
        addMessage(node.text, 'bot');

        // Handle different node types
        switch (node.type) {
            case 'options':
                showOptions(node.options);
                break;
            case 'input':
                showInputField(node.input_type);
                break;
            case 'calendar':
                showCalendar();
                break;
            case 'summary':
                showOrderSummary();
                break;
            case 'message':
                // For message type nodes, just show the message
                break;
        }
    }

    // Show options
    function showOptions(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.classList.add('options-container');
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.classList.add('option-button');
            button.textContent = option.text;
            button.addEventListener('click', () => {
                handleOptionSelect(option);
            });
            optionsContainer.appendChild(button);
        });

        chatMessages.appendChild(optionsContainer);
    }

    // Handle option selection
    function handleOptionSelect(option) {
        // Save current state before changing
        if (currentState !== 'visit') {
            conversationHistory.push({
                state: currentState,
                orderData: { ...orderData }
            });
        }

        // Add user message
        addMessage(option.text, 'user');
        
        // Update order data based on current node (detailed mapping)
        const currentNode = getCurrentNode();
        if (currentNode.id === "welcome") {
            orderData.productclass = option.text;
        } else if (["seals_types", "new_hydraulic_equipment", "repair_equipment", "new_pneumatic_equipment", "tractor_equipment"].includes(currentNode.id)) {
            orderData.productType = option.text;
        } else if (["hydraulic_pumps", "hydraulic_cylinder_parts", "oil_filter_type", "hydraulic_motor_brand", "hydraulic_valves", "circlips_type", "hydraulic_power_pack", "repair_equipment", "pneumatic_valve_type", "frl_unit_part", "tractor_equipment"].includes(currentNode.id)) {
            orderData.subproducttype = option.text;
        } else if (["gear_pump_brand", "vane_pump_brand", "plunger_pump_shaft_type", "oil_seals_brand", "u_seals_material", "rod_seals_material", "chevron_sets_material", "wiper_seals_material", "o_rings_material", "directional_valve_brand", "hand_lever_valve_brand", "gearpump_sealkit_brand"].includes(currentNode.id)) {
            orderData.brand_or_material = option.text;
        } else if (["plunger_pump_type", "complete_cylinder_type", "directional_valve_type", "solenoid_coils", "gear_coupling", "repair_cylinder_type", "repair_pump_type", "pneumatic_cylinder_choice", "pu_tubes_material", "solenoid_valve_type", "qrc_type", "trolley_jack_seals"].includes(currentNode.id)) {
            orderData.classification = option.text;
        }
        // Fallback: if node id ends with _material or _brand, set brand_or_material
        if (currentNode.id.endsWith('_material') || currentNode.id.endsWith('_brand')) {
            orderData.brand_or_material = option.text;
        }
        // Move to next node
        currentState = option.next;
        showCurrentNode();
    }

    // Show input field
    function showInputField(inputType) {
        // Reset any previous input restrictions
        messageInput.value = '';
        
        // Set input type based on the field
        if (inputType === 'tel') {
            messageInput.type = 'tel';
            // Remove any existing listeners
            messageInput.removeEventListener('input', phoneInputHandler);
            // Add new listener
            messageInput.addEventListener('input', phoneInputHandler);
        } else if (inputType === 'email') {
            messageInput.type = 'email';
        } else if (inputType === 'textarea') {
            messageInput.type = 'text';
            messageInput.style.height = '100px';
            messageInput.style.resize = 'vertical';
        } else {
            messageInput.type = 'text';
            messageInput.style.height = '40px';
            messageInput.style.resize = 'none';
        }

        messageInput.placeholder = 'Type your response...';
        messageInput.focus();
    }

    // Phone input handler function
    function phoneInputHandler(e) {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    }

    // Process user input
    function processUserInput(input, node) {
        // Save current state before processing
        if (currentState !== 'welcome') {
            conversationHistory.push({
                state: currentState,
                orderData: { ...orderData }
            });
        }

        // Phone number validation
        if (node.id === "customer_contact") {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(input)) {
                addMessage("Please enter a valid 10-digit phone number.", 'bot');
                return;
            }
            // Reset input field after phone number
            messageInput.type = 'text';
            messageInput.removeEventListener('input', phoneInputHandler);
        }

        // Email validation
        if (node.id === "customer_email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input)) {
                addMessage("Please enter a valid email address.", 'bot');
                return;
            }
        }

        // Quantity validation
        if (node.id === "Quantity") {
            const quantity = parseInt(input);
            if (isNaN(quantity) || quantity <= 0) {
                addMessage("Please enter a valid quantity (greater than 0).", 'bot');
                return;
            }
        }

        // Additional info validation - allow both alphabets and numbers
        if (node.id.endsWith("_info") || node.id.endsWith("_issue") || node.id.endsWith("_note") || 
            node.id === "repair_power_pack" || node.id === "pneumatic_cylinder_repair") {
            const alphanumericRegex = /^[a-zA-Z0-9\s.,-]+$/;
            if (!alphanumericRegex.test(input)) {
                addMessage("Please enter only letters, numbers, spaces, periods, commas, and hyphens.", 'bot');
                return;
            }
        }

        // Add user message
        addMessage(input, 'user');
        messageInput.value = ''; // Clear input after adding message

        // Update order data based on current node
        if (node.id === "customer_name") {
            orderData.customerName = input;
        } else if (node.id === "customer_email") {
            orderData.customerEmail = input;
        } else if (node.id === "customer_contact") {
            orderData.customerPhone = input;
        } else if (node.id === "delivery_Location_question") {
            orderData.customerlocation = input;
        } else if (node.id === "Quantity") {
            orderData.quantity = parseInt(input);
        } else if (node.id.endsWith("_info") || node.id.endsWith("_issue") || node.id.endsWith("_note") || 
                   node.id === "repair_power_pack" || node.id === "pneumatic_cylinder_repair") {
            // Initialize additionalInfo object if it doesn't exist
            if (!orderData.additionalInfo) {
                orderData.additionalInfo = {};
            }
            // Store the info with the node id as the key
            orderData.additionalInfo[node.id] = input;
        }

        // Move to next node
        if (node.next) {
            currentState = node.next;
            showCurrentNode();
        }
    }

    // Show calendar
    function showCalendar() {
        const calendarContainer = document.createElement('div');
        calendarContainer.classList.add('calendar-container');
        
        // Create calendar HTML
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 90); // Allow booking up to 90 days in advance

        const calendar = document.createElement('div');
        calendar.innerHTML = `
            <div class="calendar-header">
                <button class="prev-month">&lt;</button>
                <span class="current-month"></span>
                <button class="next-month">&gt;</button>
            </div>
            <div class="calendar-grid">
                <div class="weekdays">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                </div>
                <div class="days"></div>
            </div>
        `;

        calendarContainer.appendChild(calendar);
        chatMessages.appendChild(calendarContainer);

        // Initialize calendar
        let currentDate = new Date();
        updateCalendar(currentDate);

        // Add event listeners for month navigation
        calendar.querySelector('.prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar(currentDate);
        });

        calendar.querySelector('.next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar(currentDate);
        });

        function updateCalendar(date) {
            const year = date.getFullYear();
            const month = date.getMonth();
            
            // Update month display
            calendar.querySelector('.current-month').textContent = 
                `${date.toLocaleString('default', { month: 'long' })} ${year}`;

            // Clear previous days
            const daysContainer = calendar.querySelector('.days');
            daysContainer.innerHTML = '';

            // Get first day of month and total days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const totalDays = lastDay.getDate();
            const startingDay = firstDay.getDay();

            // Add empty cells for days before first of month
            for (let i = 0; i < startingDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.classList.add('day', 'empty');
                daysContainer.appendChild(emptyDay);
            }

            // Add days of month
            for (let day = 1; day <= totalDays; day++) {
                const dayElement = document.createElement('div');
                dayElement.classList.add('day');
                dayElement.textContent = day;

                const currentDay = new Date(year, month, day);
                
                // Disable past dates
                if (currentDay < today) {
                    dayElement.classList.add('disabled');
                } else if (currentDay > maxDate) {
                    dayElement.classList.add('disabled');
                } else {
                    dayElement.addEventListener('click', () => {
                        // Remove selected class from all days
                        daysContainer.querySelectorAll('.day').forEach(d => 
                            d.classList.remove('selected'));
                        
                        // Add selected class to clicked day
                        dayElement.classList.add('selected');
                        
                        // Update order data
                        orderData.deliveryDate = currentDay.toISOString().split('T')[0];
                        
                        // Move to next node
                        const nextNode = chatFlow.nodes.find(node => node.id === 'order_summary');
                        if (nextNode) {
                            currentState = nextNode.id;
                            showCurrentNode();
                        }
                    });
                }

                daysContainer.appendChild(dayElement);
            }
        }
    }

    // Show order summary
    function showOrderSummary() {
        // Add time of order place
        const now = new Date();
        orderData.timeOfOrderPlace = now.toLocaleString();

        // Create a formatted summary
        let summaryText = '<div class="order-summary">';
        summaryText += '<h3>Order Summary</h3>';
        
        // Add quantity and product info first
        if (orderData.quantity) {
            summaryText += `<div class="summary-item">• <strong>Quantity:</strong> ${orderData.quantity}</div>`;
        }
        
        // Add product details
        const productDetails = [
            { label: 'Product Class', value: orderData.productclass },
            { label: 'Product Type', value: orderData.productType },
            { label: 'Sub Product Type', value: orderData.subproducttype },
            { label: 'Brand/Material', value: orderData.brand_or_material },
            { label: 'Classification', value: orderData.classification }
        ];

        summaryText += '<div class="product-details">';
        productDetails.forEach(field => {
            if (field.value) {
                summaryText += `<div class="summary-item">• <strong>${field.label}:</strong> ${field.value}</div>`;
            }
        });
        summaryText += '</div>';

        // Add additional specifications if any
        if (orderData.additionalInfo) {
            summaryText += '<div class="specifications">';
            Object.entries(orderData.additionalInfo).forEach(([key, value]) => {
                summaryText += `<div class="summary-item">• <strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value}</div>`;
            });
            summaryText += '</div>';
        }

        // Add customer details
        summaryText += '<div class="customer-details">';
        summaryText += '<h4>Customer Information</h4>';
        const customerDetails = [
            { label: 'Name/Company', value: orderData.customerName },
            { label: 'Email', value: orderData.customerEmail },
            { label: 'Phone', value: orderData.customerPhone },
            { label: 'Delivery Address', value: orderData.customerlocation },
            { label: 'Delivery Date', value: orderData.deliveryDate }
        ];

        customerDetails.forEach(field => {
            if (field.value) {
                summaryText += `<div class="summary-item">• <strong>${field.label}:</strong> ${field.value}</div>`;
            }
        });
        summaryText += '</div>';

        // Add order time
        summaryText += `<div class="order-time">• <strong>Order Time:</strong> ${orderData.timeOfOrderPlace}</div>`;
        summaryText += '</div>';

        // Add CSS for the summary
        const style = document.createElement('style');
        style.textContent = `
            .order-summary {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 10px 0;
                font-family: Arial, sans-serif;
            }
            .order-summary h3 {
                color: #245352;
                margin: 0 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #245352;
            }
            .order-summary h4 {
                color: #245352;
                margin: 15px 0 10px 0;
            }
            .summary-item {
                margin: 8px 0;
                line-height: 1.4;
                padding-left: 5px;
            }
            .product-details, .specifications, .customer-details {
                margin: 15px 0;
            }
            .order-time {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
            }
            .summary-item strong {
                color: #245352;
                margin-right: 5px;
            }
        `;
        document.head.appendChild(style);

        addMessage(summaryText, 'bot');

        // Add the submit button below the summary
        const submitButton = document.createElement('button');
        submitButton.className = 'submit-order';
        submitButton.textContent = isSubmitting ? 'Submitting...' : 'Submit Order';
        submitButton.disabled = isSubmitting;
        submitButton.style.margin = '16px 0 0 0';
        submitButton.addEventListener('click', handleSubmitOrder);
        chatMessages.appendChild(submitButton);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle order submission
    async function handleSubmitOrder() {
        if (isSubmitting) return;
        isSubmitting = true;

        try {
            // Prepare the order data
            const orderData = {
                productclass: currentState,
                productType: orderData.productType || '',
                subproducttype: orderData.subproducttype || '',
                classification: orderData.classification || '',
                brand_or_material: orderData.brand_or_material || '',
                additionalInfo: orderData.additionalInfo || '',
                quantity: orderData.quantity || '',
                customerName: orderData.customerName || '',
                customerPhone: orderData.customerPhone || '',
                customerEmail: orderData.customerEmail || '',
                customerlocation: orderData.customerlocation || '',
                deliveryDate: orderData.deliveryDate || ''
            };

            // Send the order data to the email service
            const response = await fetch('https://sat-p3hh.onrender.com/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderData })
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                addMessage('Thank you for your order! We will contact you shortly.', 'bot');
                // Reset the chat after successful submission
                setTimeout(() => {
                    currentState = 'visit';
                    orderData = {};
                    showCurrentNode();
                }, 3000);
            } else {
                // Show error message
                addMessage('Sorry, there was an error processing your order. Please try again later.', 'bot');
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            addMessage('Sorry, there was an error processing your order. Please try again later.', 'bot');
        } finally {
            isSubmitting = false;
        }
    }

    // Initialize chat
    showCurrentNode();
}); 
