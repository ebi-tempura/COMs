export const LANGUAGES = Object.freeze({
  ENGLISH: "en",
  SPANISH_MX: "es-MX",
});

const english = {
  common: {
    language: "Language",
    english: "English",
    spanishMexico: "Español (México)",
    filter: "Filter",
    export: "Export",
    close: "Close",
    allStatuses: "All Statuses",
    none: "None",
    activity: "Activity",
    unknownTime: "Unknown time",
    unknownUser: "Unknown user",
    unknownRole: "Unknown role",
    noStatus: "No status",
    comment: "Comment",
    viewRecordedValues: "View recorded values",
    total: "Total",
    showingResults: "Showing 1 to {shown} of {total} results",
  },
  brand: { tagline: "Condominium Operational Management System" },
  nav: {
    dashboard: "Dashboard",
    workOrders: "Work Orders",
    suppliers: "Suppliers",
    residents: "Residents",
    reports: "Reports",
    documents: "Documents",
    settings: "Settings",
    logout: "Logout",
  },
  login: {
    welcome: "Welcome back",
    subtitle: "Sign in to manage condominium operations.",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
  },
  roleSwitcher: { testingAs: "Testing as" },
  placeholders: {
    dashboard: "Dashboard",
    residents: "Residents",
    reports: "Reports",
    documents: "Documents",
    settings: "Settings",
  },
  workOrders: {
    title: "Work Orders",
    subtitle: "Create, approve, and track condominium maintenance work.",
    createTitle: "Create New Work Order",
    searchPlaceholder: "Search work orders...",
    detailsTitle: "Work order details",
    rejectionPrompt: "Enter the reason for rejection:",
    completionRejectionPrompt: "Enter the reason for rejecting completion:",
  },
  workOrderForm: {
    title: "Title *",
    titlePlaceholder: "Enter work order title",
    supplier: "Supplier *",
    selectSupplier: "Select supplier",
    amount: "Requested Amount (MXN) *",
    priority: "Priority *",
    selectPriority: "Select priority",
    type: "Type *",
    selectType: "Select type",
    category: "Category *",
    selectCategory: "Select category",
    location: "Location *",
    locationPlaceholder: "e.g., Lobby, Parking, Roof",
    requestedBy: "Requested By *",
    selectRequester: "Select requester",
    targetDate: "Target Date",
    description: "Description *",
    descriptionPlaceholder:
      "Describe the issue, work needed, and any relevant details...",
    attachments: "Attachments",
    dropFiles: "Drag and drop files here or",
    browseFiles: "Browse Files",
    fileHelp: "PDF, JPG, PNG max. 10MB each",
    create: "Create Work Order",
  },
  workOrderTable: {
    id: "ID",
    title: "Title",
    category: "Category",
    supplier: "Supplier",
    requestedBy: "Requested By",
    amount: "Amount (MXN)",
    status: "Status",
    priority: "Priority",
    actions: "Actions",
    view: "View",
    submit: "Submit",
    approve: "Approve",
    reject: "Reject",
    edit: "Edit",
    inactive: "Inactive",
    startWork: "Start Work",
    submitCompletion: "Submit Completion",
    approveCompletion: "Approve Completion",
    rejectCompletion: "Reject Completion",
  },
  workOrderDetails: {
    title: "Work Order title",
    status: "Status",
    supplier: "Supplier",
    amount: "Amount",
    priority: "Priority",
    description: "Description",
    auditTrail: "Audit Trail",
  },
  audit: { empty: "No audit events have been recorded." },
  suppliers: {
    title: "Suppliers",
    subtitle:
      "Manage companies and individual contractors approved for condominium work.",
    createTitle: "Create a New Supplier",
    directory: "Supplier Directory",
    searchPlaceholder: "Search suppliers...",
    rejectionPrompt: "Enter rejection reason:",
    rejectionRequired: "Rejection requires a comment.",
  },
  supplierForm: {
    supplierType: "Supplier Type",
    name: "Name",
    serviceCategory: "Service Category",
    contactPerson: "Contact Person",
    phone: "Phone",
    email: "Email",
    rfc: "RFC",
    address: "Address",
    clabe: "CLABE",
    paymentMethod: "Payment Method",
    notes: "Notes",
    attachments: "Attachments",
    dropFiles: "Drag and drop files here or",
    browseFiles: "Browse Files",
    fileHelp: "PDF, JPG, PNG max. 10MB each",
    add: "Add Supplier",
  },
  supplierTable: {
    id: "ID",
    type: "Type",
    name: "Name",
    category: "Category",
    status: "Status",
    rfc: "RFC",
    actions: "Actions",
    view: "View supplier",
    more: "More actions",
    submit: "Submit",
    resubmit: "Resubmit",
    rfcValid: "RFC Valid",
    rfcFailed: "RFC Failed",
    manualReview: "Manual Review",
    approve: "Approve",
    reject: "Reject",
    edit: "Edit",
    inactive: "Inactive",
  },
};

const spanishMexico = {
  common: {
    language: "Idioma",
    english: "English",
    spanishMexico: "Español (México)",
    filter: "Filtrar",
    export: "Exportar",
    close: "Cerrar",
    allStatuses: "Todos los estados",
    none: "Ninguno",
    activity: "Actividad",
    unknownTime: "Hora desconocida",
    unknownUser: "Usuario desconocido",
    unknownRole: "Rol desconocido",
    noStatus: "Sin estado",
    comment: "Comentario",
    viewRecordedValues: "Ver valores registrados",
    total: "Total",
    showingResults: "Mostrando 1 a {shown} de {total} resultados",
  },
  brand: { tagline: "Sistema de Gestión Operativa de Condominios" },
  nav: {
    dashboard: "Panel",
    workOrders: "Órdenes de trabajo",
    suppliers: "Proveedores",
    residents: "Residentes",
    reports: "Reportes",
    documents: "Documentos",
    settings: "Configuración",
    logout: "Cerrar sesión",
  },
  login: {
    welcome: "Bienvenido de nuevo",
    subtitle: "Inicia sesión para gestionar las operaciones del condominio.",
    email: "Correo electrónico",
    password: "Contraseña",
    passwordPlaceholder: "Ingresa tu contraseña",
    rememberMe: "Recordarme",
    forgotPassword: "¿Olvidaste tu contraseña?",
    signIn: "Iniciar sesión",
  },
  roleSwitcher: { testingAs: "Probando como" },
  placeholders: {
    dashboard: "Panel",
    residents: "Residentes",
    reports: "Reportes",
    documents: "Documentos",
    settings: "Configuración",
  },
  workOrders: {
    title: "Órdenes de trabajo",
    subtitle:
      "Crea, aprueba y da seguimiento al mantenimiento del condominio.",
    createTitle: "Crear nueva orden de trabajo",
    searchPlaceholder: "Buscar órdenes de trabajo...",
    detailsTitle: "Detalles de la orden de trabajo",
    rejectionPrompt: "Ingresa el motivo del rechazo:",
    completionRejectionPrompt:
      "Ingresa el motivo para rechazar la terminación:",
  },
  workOrderForm: {
    title: "Título *",
    titlePlaceholder: "Ingresa el título de la orden de trabajo",
    supplier: "Proveedor *",
    selectSupplier: "Selecciona un proveedor",
    amount: "Monto solicitado (MXN) *",
    priority: "Prioridad *",
    selectPriority: "Selecciona una prioridad",
    type: "Tipo *",
    selectType: "Selecciona un tipo",
    category: "Categoría *",
    selectCategory: "Selecciona una categoría",
    location: "Ubicación *",
    locationPlaceholder: "p. ej., Vestíbulo, Estacionamiento, Azotea",
    requestedBy: "Solicitado por *",
    selectRequester: "Selecciona al solicitante",
    targetDate: "Fecha objetivo",
    description: "Descripción *",
    descriptionPlaceholder:
      "Describe el problema, el trabajo necesario y cualquier detalle relevante...",
    attachments: "Archivos adjuntos",
    dropFiles: "Arrastra y suelta archivos aquí o",
    browseFiles: "Seleccionar archivos",
    fileHelp: "PDF, JPG o PNG; máximo 10 MB por archivo",
    create: "Crear orden de trabajo",
  },
  workOrderTable: {
    id: "ID",
    title: "Título",
    category: "Categoría",
    supplier: "Proveedor",
    requestedBy: "Solicitado por",
    amount: "Monto (MXN)",
    status: "Estado",
    priority: "Prioridad",
    actions: "Acciones",
    view: "Ver",
    submit: "Enviar",
    approve: "Aprobar",
    reject: "Rechazar",
    edit: "Editar",
    inactive: "Inactivar",
    startWork: "Iniciar trabajo",
    submitCompletion: "Enviar terminación",
    approveCompletion: "Aprobar terminación",
    rejectCompletion: "Rechazar terminación",
  },
  workOrderDetails: {
    title: "Título de la orden",
    status: "Estado",
    supplier: "Proveedor",
    amount: "Monto",
    priority: "Prioridad",
    description: "Descripción",
    auditTrail: "Historial de auditoría",
  },
  audit: { empty: "No se han registrado eventos de auditoría." },
  suppliers: {
    title: "Proveedores",
    subtitle:
      "Gestiona empresas y contratistas individuales autorizados para trabajar en el condominio.",
    createTitle: "Crear nuevo proveedor",
    directory: "Directorio de proveedores",
    searchPlaceholder: "Buscar proveedores...",
    rejectionPrompt: "Ingresa el motivo del rechazo:",
    rejectionRequired: "El rechazo requiere un comentario.",
  },
  supplierForm: {
    supplierType: "Tipo de proveedor",
    name: "Nombre",
    serviceCategory: "Categoría de servicio",
    contactPerson: "Persona de contacto",
    phone: "Teléfono",
    email: "Correo electrónico",
    rfc: "RFC",
    address: "Dirección",
    clabe: "CLABE",
    paymentMethod: "Método de pago",
    notes: "Notas",
    attachments: "Archivos adjuntos",
    dropFiles: "Arrastra y suelta archivos aquí o",
    browseFiles: "Seleccionar archivos",
    fileHelp: "PDF, JPG o PNG; máximo 10 MB por archivo",
    add: "Agregar proveedor",
  },
  supplierTable: {
    id: "ID",
    type: "Tipo",
    name: "Nombre",
    category: "Categoría",
    status: "Estado",
    rfc: "RFC",
    actions: "Acciones",
    view: "Ver proveedor",
    more: "Más acciones",
    submit: "Enviar",
    resubmit: "Reenviar",
    rfcValid: "RFC válido",
    rfcFailed: "RFC inválido",
    manualReview: "Revisión manual",
    approve: "Aprobar",
    reject: "Rechazar",
    edit: "Editar",
    inactive: "Inactivar",
  },
  statusLabels: {
    Draft: "Borrador",
    Submitted: "Enviada",
    "Pending RFC Validation": "Validación de RFC pendiente",
    "RFC Validated": "RFC validado",
    "Pending President Approval": "Aprobación del presidente pendiente",
    "Pending Treasurer Approval": "Aprobación del tesorero pendiente",
    "Pending Board Member Approval":
      "Aprobación de un miembro del comité pendiente",
    Approved: "Aprobada",
    "RFC Validation Failed": "Validación de RFC fallida",
    "Manual RFC Review Required": "Se requiere revisión manual del RFC",
    Rejected: "Rechazada",
    Cancelled: "Cancelada",
    Inactive: "Inactiva",
    Deleted: "Eliminada",
    "In Progress": "En progreso",
    "Pending Completion President Approval":
      "Aprobación de terminación del presidente pendiente",
    "Pending Completion Treasurer Approval":
      "Aprobación de terminación del tesorero pendiente",
    "Pending Completion Board Member Approval":
      "Aprobación de terminación de un miembro del comité pendiente",
    "Completion Rejected": "Terminación rechazada",
    Completed: "Completada",
    Active: "Activo",
    Pending: "Pendiente",
  },
  roleLabels: {
    "Super Admin": "Superadministrador",
    Admin: "Administrador",
    President: "Presidente",
    Treasurer: "Tesorero",
    "Board Member": "Miembro del comité",
    Resident: "Residente",
    Manager: "Gerente",
    Staff: "Personal",
    System: "Sistema",
  },
  actionLabels: {
    view: "Ver",
    create: "Crear",
    edit: "Editar",
    submit: "Enviar",
    approve: "Aprobar",
    reject: "Rechazar",
    resubmit: "Reenviar",
    cancel: "Cancelar",
    deleteInactive: "Marcar como inactivo",
    startWork: "Iniciar trabajo",
    completeWork: "Enviar terminación",
    rfcValidated: "RFC validado",
    rfcValidationFailed: "Validación de RFC fallida",
    manualRfcReviewRequired: "Revisión manual del RFC requerida",
  },
  fieldLabels: {
    title: "Título",
    supplier: "Proveedor",
    amount: "Monto",
    priority: "Prioridad",
    category: "Categoría",
    location: "Ubicación",
    requestedBy: "Solicitado por",
    targetDate: "Fecha objetivo",
    description: "Descripción",
    type: "Tipo",
    status: "Estado",
  },
  valueLabels: {
    priority: { Low: "Baja", Medium: "Media", High: "Alta" },
    category: {
      Electrical: "Electricidad",
      Plumbing: "Plomería",
      Maintenance: "Mantenimiento",
      Safety: "Seguridad",
      Landscaping: "Jardinería",
      Cleaning: "Limpieza",
      Security: "Vigilancia",
      Elevator: "Elevadores",
      "General Maintenance": "Mantenimiento general",
    },
    workOrderType: { Emergency: "Emergencia", Normal: "Normal" },
    supplierType: { Company: "Empresa", Individual: "Persona física" },
    paymentMethod: {
      "Bank transfer": "Transferencia bancaria",
      Cash: "Efectivo",
      Card: "Tarjeta",
      Other: "Otro",
    },
  },
  userNames: {
    "super-admin-1": "Usuario superadministrador",
    "admin-1": "Usuario administrador",
    "president-1": "Usuario presidente",
    "treasurer-1": "Usuario tesorero",
    "board-member-1": "Usuario miembro del comité",
    "resident-1": "Usuario residente",
    "manager-1": "Usuario gerente",
    "staff-1": "Usuario de personal",
  },
  userNamesByName: {
    "Super Admin User": "Usuario superadministrador",
    "Admin User": "Usuario administrador",
    "President User": "Usuario presidente",
    "Treasurer User": "Usuario tesorero",
    "Board Member User": "Usuario miembro del comité",
    "Resident User": "Usuario residente",
    "Manager User": "Usuario gerente",
    "Staff User": "Usuario de personal",
    System: "Sistema",
  },
  workflowMessages: {
    "Work Order amount is required.":
      "El monto de la orden de trabajo es obligatorio.",
    "Work Order amount must be a valid number.":
      "El monto de la orden de trabajo debe ser un número válido.",
    "Work Order amount must be greater than zero.":
      "El monto de la orden de trabajo debe ser mayor que cero.",
    "A Work Order is required.": "Se requiere una orden de trabajo.",
    "The Work Order does not have a locked approval route.":
      "La orden de trabajo no tiene una ruta de aprobación bloqueada.",
    "The Work Order does not have a current approval step.":
      "La orden de trabajo no tiene un paso de aprobación actual.",
    "You cannot approve or reject your own Work Order.":
      "No puedes aprobar ni rechazar tu propia orden de trabajo.",
    "This Work Order is not awaiting the current approval step.":
      "Esta orden de trabajo no está esperando el paso de aprobación actual.",
    "Rejection requires a comment.":
      "El rechazo requiere un comentario.",
    "Only Staff or Manager can start work or submit completion.":
      "Solo el personal o el gerente pueden iniciar el trabajo o enviar la terminación.",
    "Only an approved Work Order can be started.":
      "Solo se puede iniciar una orden de trabajo aprobada.",
    "Only an in-progress or completion-rejected Work Order can be submitted for completion approval.":
      "Solo una orden en progreso o con terminación rechazada puede enviarse para aprobar su terminación.",
    "The Work Order does not have a locked completion approval route.":
      "La orden de trabajo no tiene una ruta bloqueada para aprobar la terminación.",
    "The Work Order does not have a current completion approval step.":
      "La orden de trabajo no tiene un paso actual para aprobar la terminación.",
    "You cannot approve or reject completion of your own Work Order.":
      "No puedes aprobar ni rechazar la terminación de tu propia orden de trabajo.",
    "This Work Order is not awaiting the current completion approval step.":
      "Esta orden de trabajo no está esperando el paso actual de aprobación de terminación.",
    "Completion rejection requires a comment.":
      "El rechazo de la terminación requiere un comentario.",
    "Work Order not found.": "No se encontró la orden de trabajo.",
    "You cannot approve your own supplier request.":
      "No puedes aprobar tu propia solicitud de proveedor.",
    "Only the President can approve this step.":
      "Solo el presidente puede aprobar este paso.",
    "Only a Board Member can approve this step.":
      "Solo un miembro del comité puede aprobar este paso.",
    "You cannot reject your own supplier request.":
      "No puedes rechazar tu propia solicitud de proveedor.",
    "Only the President can reject this step.":
      "Solo el presidente puede rechazar este paso.",
    "Only a Board Member can reject this step.":
      "Solo un miembro del comité puede rechazar este paso.",
  },
};

const dictionaries = {
  [LANGUAGES.ENGLISH]: english,
  [LANGUAGES.SPANISH_MX]: spanishMexico,
};

function readPath(source, path) {
  return path.split(".").reduce((value, segment) => value?.[segment], source);
}

function interpolate(template, variables = {}) {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function translate(language, key, variables) {
  const value =
    readPath(dictionaries[language], key) ??
    readPath(dictionaries[LANGUAGES.ENGLISH], key) ??
    key;
  return typeof value === "string" ? interpolate(value, variables) : value;
}

export function translateMapValue(language, mapName, value) {
  if (value === null || value === undefined || value === "") return value;
  return dictionaries[language]?.[mapName]?.[value] ?? String(value);
}

export function translateGroupedValue(language, groupName, value) {
  if (value === null || value === undefined || value === "") return value;
  return (
    dictionaries[language]?.valueLabels?.[groupName]?.[value] ?? String(value)
  );
}

export function translateWorkflowMessage(language, message) {
  if (!message) return message;
  const translated = dictionaries[language]?.workflowMessages?.[message];
  if (translated) return translated;

  const roleMessage = message.match(
    /^Only the (.+) can act on this (completion )?step\.$/
  );
  if (roleMessage && language === LANGUAGES.SPANISH_MX) {
    const role = translateMapValue(language, "roleLabels", roleMessage[1]);
    return roleMessage[2]
      ? `Solo ${role} puede actuar en este paso de terminación.`
      : `Solo ${role} puede actuar en este paso.`;
  }

  return message;
}

export function getLocale(language) {
  return language === LANGUAGES.SPANISH_MX ? "es-MX" : "en-US";
}
