import { useLanguage} from "../../i18n/LanguageContext";
import "../../styles/format.css"

const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");

function WorkOrderEmergency({workOrder}){
  const{
    actionLabel,
    }
}

function handleSubmit(event){
    event.preventDefault();

    const emergencyworkorder = {
        
        what_happened=FormData.what_happened,
        where_happened=FormData.where_happened,
        who_happened=FromData.who_happened,
        when_happened=FormData.when_happened,
        why_happened=FromData.why_happened,
        how_happened=FromData.how_happened,
        howmuch_happened=FromData.howmuch_happened,
    }

}

function handleChange(event) {
  const { name, value } = event.target;

  setFormData((current) => ({
    ...current,
    [name]: value,
  }));
}

return(
    <form className="from-grid">
        
        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.what")}</label>
        <input
         name="What happened?"
         value={FormData.what_happened}
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderWhat")}
         required
        />
        </div>
        
        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.where")}</label>
        <input
         name="where it happened?"
         value={FormData.where_happened}
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderWhere")}
         required
        />
        </div>

        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.who")}</label>
        <input
         name="Who discover it?"
         value={FormData.who_happened}
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderWho")}
         required
        />
        </div>

        <div className="form-group form-wide">
        <label htmlFor="when_happened"> {f("workOrderEmergency.when")}</label>
        <input
         id="when_happened"
         name="when_happened"
         type="date"
         min={today}
         value={FormData.when_happened}
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderWhen")}
         required
        />
    
        </div>

        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.why")}</label>
        <input
         name="Why it happened?"
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderWhy")}
         required
        />
        </div>

        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.how")}</label>
        <input
         name="How it happened?"
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderHow")}
         required
        />
        </div>

        <div className="form-group form-wide">
        <label> {f("workOrderEmergency.howmuch")}</label>
        <input
         name="How much it cost??"
         onChange={handleChange}
         placeholder={t("workOrderEmergency.descriptionPlaceholderHowmany")}
         required
        />
        </div>

    </form> 





)