import { SignUpForm } from "@/components/sign-up-form";

export const metadata = {
    title: "Sign Up | ClaimKing AI",
    description: "",
};

export default function Page() {
  return (
    <>
        <div className="flex min-h-svh w-full items-center justify-center mt-10 px-2 md:p-10">
            <div className="w-full">
                <SignUpForm />
            </div>
        </div>
    </>
  );
}
